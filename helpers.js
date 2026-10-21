const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { createApp } = require('../src/app');
async function testServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopping-list-test-'));
  const app = createApp({ dataDir });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  return { ...app, baseUrl, dataDir, close: async () => { await new Promise(resolve => app.server.close(resolve)); fs.rmSync(dataDir, { recursive: true, force: true }); } };
}
async function request(baseUrl, url, options = {}) {
  const headers = { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  return fetch(baseUrl + url, { ...options, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), redirect: 'manual' });
}
async function register(baseUrl, email, password = 'PoprawneHaslo123!') {
  const res = await request(baseUrl, '/api/auth/register', { method: 'POST', body: { email, password } });
  const data = await res.json(); return { res, data };
}
async function login(baseUrl, email, password = 'PoprawneHaslo123!') {
  const res = await request(baseUrl, '/api/auth/login', { method: 'POST', body: { email, password } });
  const data = res.status === 204 ? null : await res.json();
  return { res, data, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}
module.exports = { testServer, request, register, login };
