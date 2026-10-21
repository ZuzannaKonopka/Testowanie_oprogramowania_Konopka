const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { JsonStore } = require('./store');
const { validateEmail, validatePassword, validateListName, validateItem, canManageList, canAccessList, hashPassword, verifyPassword, safeUser } = require('./domain');

const COOKIE = 'shopping_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BODY = 1024 * 1024;

function createApp(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(process.cwd(), '.data');
  const publicDir = options.publicDir || path.join(__dirname, '..', 'public');
  const store = options.store || new JsonStore(dataDir);
  const sessions = new Map();
  const loginAttempts = new Map();

  function send(res, status, data, headers = {}) {
    const body = data === undefined ? '' : JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', ...headers });
    res.end(body);
  }
  function securityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }
  function parseCookies(header = '') {
    return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
      const idx = part.indexOf('='); return idx < 0 ? [part, ''] : [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
    }));
  }
  function sessionUser(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    const session = token && sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) { sessions.delete(token); return null; }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return store.userById(session.userId) || null;
  }
  function requireAuth(req, res) {
    const user = sessionUser(req);
    if (!user) { send(res, 401, { error: 'Wymagane logowanie.' }); return null; }
    return user;
  }
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let raw = ''; let size = 0;
      req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Żądanie jest zbyt duże.'), { status: 413 })); req.destroy(); return; } raw += chunk; });
      req.on('end', () => {
        if (!raw) return resolve({});
        if (!String(req.headers['content-type'] || '').includes('application/json')) return reject(Object.assign(new Error('Wymagany Content-Type: application/json.'), { status: 415 }));
        try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('Niepoprawny JSON.'), { status: 400 })); }
      });
      req.on('error', reject);
    });
  }
  function cleanList(list) {
    return { id: list.id, name: list.name, ownerId: list.ownerId, sharedWith: list.sharedWith, dueDate: list.dueDate, items: list.items, createdAt: list.createdAt, updatedAt: list.updatedAt };
  }
  function getAccessibleList(listId, user, res) {
    const list = store.listById(listId);
    if (!list) { send(res, 404, { error: 'Nie znaleziono listy.' }); return null; }
    if (!canAccessList(list, user.id)) { send(res, 404, { error: 'Nie znaleziono listy.' }); return null; }
    return list;
  }

  const server = http.createServer(async (req, res) => {
    securityHeaders(res);
    try {
      const url = new URL(req.url, 'http://localhost');
      const method = req.method;
      const pathname = decodeURIComponent(url.pathname);
      if (method === 'GET' && pathname === '/api/health') return send(res, 200, { status: 'ok', service: 'shopping-list' });
      if (method === 'GET' && pathname === '/api/auth/me') {
        const user = sessionUser(req); return user ? send(res, 200, { user: safeUser(user) }) : send(res, 200, { user: null });
      }
      if (method === 'POST' && pathname === '/api/auth/register') {
        const body = await readBody(req);
        if (!validateEmail(body.email)) return send(res, 400, { error: 'Podaj poprawny adres e-mail.' });
        if (!validatePassword(body.password)) return send(res, 400, { error: 'Hasło musi mieć od 10 do 128 znaków.' });
        const email = body.email.trim().toLowerCase();
        if (store.userByEmail(email)) return send(res, 409, { error: 'Konto z tym adresem e-mail już istnieje.' });
        const user = { id: store.id(), email, passwordHash: hashPassword(body.password), createdAt: new Date().toISOString() };
        store.data.users.push(user); store.persist();
        return send(res, 201, { user: safeUser(user) });
      }
      if (method === 'POST' && pathname === '/api/auth/login') {
        const body = await readBody(req);
        const ip = req.socket.remoteAddress || 'unknown';
        const attempt = loginAttempts.get(ip) || { count: 0, until: 0 };
        if (attempt.until > Date.now() && attempt.count >= 10) return send(res, 429, { error: 'Zbyt wiele prób logowania. Spróbuj ponownie później.' }, { 'Retry-After': '60' });
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const user = store.userByEmail(email);
        if (!user || !verifyPassword(body.password, user.passwordHash)) {
          attempt.count = attempt.until > Date.now() ? attempt.count + 1 : 1; attempt.until = Date.now() + 60_000; loginAttempts.set(ip, attempt);
          return send(res, 401, { error: 'Nieprawidłowy e-mail lub hasło.' });
        }
        loginAttempts.delete(ip);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
        return send(res, 200, { user: safeUser(user) }, { 'Set-Cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}` });
      }
      if (method === 'POST' && pathname === '/api/auth/logout') {
        const token = parseCookies(req.headers.cookie)[COOKIE]; if (token) sessions.delete(token);
        return send(res, 204, undefined, { 'Set-Cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
      }
      if (method === 'GET' && pathname === '/') {
        const file = path.join(publicDir, 'index.html');
        const content = fs.readFileSync(file);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': content.length, 'Cache-Control': 'no-cache' }); return res.end(content);
      }
      if (pathname.startsWith('/api/')) {
        const user = requireAuth(req, res); if (!user) return;
        if (method === 'GET' && pathname === '/api/lists') {
          const lists = store.data.lists.filter(l => canAccessList(l, user.id)).map(cleanList);
          return send(res, 200, { lists });
        }
        if (method === 'POST' && pathname === '/api/lists') {
          const body = await readBody(req);
          if (!validateListName(body.name)) return send(res, 400, { error: 'Nazwa listy musi mieć od 1 do 100 znaków.' });
          if (body.dueDate !== undefined && body.dueDate !== null && (typeof body.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(`${body.dueDate}T00:00:00Z`)))) return send(res, 400, { error: 'Data musi mieć format RRRR-MM-DD.' });
          const now = new Date().toISOString();
          const list = { id: store.id(), name: body.name.trim(), ownerId: user.id, sharedWith: [], dueDate: body.dueDate || null, items: [], createdAt: now, updatedAt: now };
          store.data.lists.push(list); store.persist(); return send(res, 201, { list: cleanList(list) });
        }
        const listMatch = pathname.match(/^\/api\/lists\/([a-f0-9-]+)$/i);
        const itemsMatch = pathname.match(/^\/api\/lists\/([a-f0-9-]+)\/items$/i);
        const itemMatch = pathname.match(/^\/api\/lists\/([a-f0-9-]+)\/items\/([a-f0-9-]+)\/toggle$/i);
        const itemDeleteMatch = pathname.match(/^\/api\/lists\/([a-f0-9-]+)\/items\/([a-f0-9-]+)$/i);
        const shareMatch = pathname.match(/^\/api\/lists\/([a-f0-9-]+)\/share$/i);
        if (listMatch) {
          const list = getAccessibleList(listMatch[1], user, res); if (!list) return;
          if (method === 'GET') return send(res, 200, { list: cleanList(list) });
          if (method === 'PATCH') {
            if (!canManageList(list, user.id)) return send(res, 403, { error: 'Tylko właściciel może zmieniać listę.' });
            const body = await readBody(req);
            if (body.name !== undefined) { if (!validateListName(body.name)) return send(res, 400, { error: 'Niepoprawna nazwa listy.' }); list.name = body.name.trim(); }
            if (body.dueDate !== undefined) { if (body.dueDate !== null && (typeof body.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate))) return send(res, 400, { error: 'Niepoprawna data.' }); list.dueDate = body.dueDate; }
            list.updatedAt = new Date().toISOString(); store.persist(); return send(res, 200, { list: cleanList(list) });
          }
          if (method === 'DELETE') {
            if (!canManageList(list, user.id)) return send(res, 403, { error: 'Tylko właściciel może usunąć listę.' });
            store.data.lists = store.data.lists.filter(l => l.id !== list.id); store.persist(); return send(res, 204);
          }
        }
        if (itemsMatch && method === 'POST') {
          const list = getAccessibleList(itemsMatch[1], user, res); if (!list) return;
          if (!canManageList(list, user.id)) return send(res, 403, { error: 'Osoba współdzieląca nie może dodawać ani usuwać produktów.' });
          const body = await readBody(req); const validated = validateItem(body);
          if (!validated.valid) return send(res, 400, { error: 'Niepoprawne dane produktu.', details: validated.errors });
          const item = { id: store.id(), ...validated.value, purchased: false, createdAt: new Date().toISOString() };
          list.items.push(item); list.updatedAt = new Date().toISOString(); store.persist(); return send(res, 201, { item });
        }
        if (itemsMatch && method === 'GET') {
          const list = getAccessibleList(itemsMatch[1], user, res); if (!list) return; return send(res, 200, { items: list.items });
        }
        if (itemMatch && method === 'PATCH') {
          const list = getAccessibleList(itemMatch[1], user, res); if (!list) return;
          const item = list.items.find(i => i.id === itemMatch[2]); if (!item) return send(res, 404, { error: 'Nie znaleziono produktu.' });
          item.purchased = !item.purchased; item.updatedAt = new Date().toISOString(); list.updatedAt = new Date().toISOString(); store.persist(); return send(res, 200, { item });
        }
        if (itemDeleteMatch && method === 'DELETE') {
          const list = getAccessibleList(itemDeleteMatch[1], user, res); if (!list) return;
          if (!canManageList(list, user.id)) return send(res, 403, { error: 'Tylko właściciel może usuwać produkty.' });
          const before = list.items.length; list.items = list.items.filter(i => i.id !== itemDeleteMatch[2]);
          if (before === list.items.length) return send(res, 404, { error: 'Nie znaleziono produktu.' });
          list.updatedAt = new Date().toISOString(); store.persist(); return send(res, 204);
        }
        if (shareMatch && method === 'POST') {
          const list = getAccessibleList(shareMatch[1], user, res); if (!list) return;
          if (!canManageList(list, user.id)) return send(res, 403, { error: 'Tylko właściciel może współdzielić listę.' });
          const body = await readBody(req); if (!validateEmail(body.email)) return send(res, 400, { error: 'Podaj poprawny adres e-mail.' });
          const target = store.userByEmail(body.email.trim().toLowerCase());
          if (!target) return send(res, 404, { error: 'Nie znaleziono użytkownika o podanym adresie e-mail.' });
          if (target.id === user.id) return send(res, 400, { error: 'Nie można współdzielić listy z samym sobą.' });
          if (!list.sharedWith.includes(target.id)) list.sharedWith.push(target.id);
          list.updatedAt = new Date().toISOString(); store.persist(); return send(res, 200, { list: cleanList(list), sharedWith: safeUser(target) });
        }
        if (method === 'GET') return send(res, 404, { error: 'Nie znaleziono endpointu.' });
        return send(res, 404, { error: 'Nie znaleziono endpointu.' });
      }
      return send(res, 404, { error: 'Nie znaleziono strony.' });
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      const status = error.status || 500;
      send(res, status, { error: status === 500 ? 'Wewnętrzny błąd serwera.' : error.message });
    }
  });
  return { server, store, sessions };
}
module.exports = { createApp };
