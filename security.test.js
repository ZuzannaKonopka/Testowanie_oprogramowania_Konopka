const test = require('node:test');
const assert = require('node:assert/strict');
const { testServer, request, register, login } = require('./helpers');

test('security headers are present on application responses', async t => {
  const app = await testServer(); t.after(app.close);
  const res = await request(app.baseUrl, '/api/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
});

test('session cookie is HttpOnly and SameSite strict; logout invalidates it', async t => {
  const app = await testServer(); t.after(app.close);
  await register(app.baseUrl, 'secure@example.com'); const auth = await login(app.baseUrl, 'secure@example.com');
  assert.match(auth.res.headers.get('set-cookie'), /HttpOnly/); assert.match(auth.res.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await request(app.baseUrl, '/api/lists', { headers: { Cookie: auth.cookie } })).status, 200);
  await request(app.baseUrl, '/api/auth/logout', { method: 'POST', headers: { Cookie: auth.cookie } });
  assert.equal((await request(app.baseUrl, '/api/lists', { headers: { Cookie: auth.cookie } })).status, 401);
});

test('a user cannot read or modify another user list by guessing its identifier', async t => {
  const app = await testServer(); t.after(app.close);
  await register(app.baseUrl, 'owner@example.com'); await register(app.baseUrl, 'attacker@example.com');
  const owner = await login(app.baseUrl, 'owner@example.com'); const attacker = await login(app.baseUrl, 'attacker@example.com');
  const created = await request(app.baseUrl, '/api/lists', { method: 'POST', headers: { Cookie: owner.cookie }, body: { name: 'Prywatna' } }); const list = (await created.json()).list;
  const read = await request(app.baseUrl, `/api/lists/${list.id}`, { headers: { Cookie: attacker.cookie } }); assert.equal(read.status, 404);
  const update = await request(app.baseUrl, `/api/lists/${list.id}`, { method: 'PATCH', headers: { Cookie: attacker.cookie }, body: { name: 'Przejęta' } }); assert.equal(update.status, 404);
});

test('weak password and malformed registration are rejected', async t => {
  const app = await testServer(); t.after(app.close);
  assert.equal((await register(app.baseUrl, 'bad-email', 'PoprawneHaslo123!')).res.status, 400);
  assert.equal((await register(app.baseUrl, 'short@example.com', 'short')).res.status, 400);
});
