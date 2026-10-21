const test = require('node:test');
const assert = require('node:assert/strict');
const { testServer, request, register, login } = require('./helpers');

test('system scenario: registration, login, shopping list lifecycle and logout', async t => {
  const app = await testServer(); t.after(app.close);
  const home = await request(app.baseUrl, '/'); assert.equal(home.status, 200); assert.match(await home.text(), /Lista zakupów/);
  const registration = await register(app.baseUrl, 'system@example.com'); assert.equal(registration.res.status, 201);
  const auth = await login(app.baseUrl, 'system@example.com'); assert.equal(auth.res.status, 200);
  const headers = { Cookie: auth.cookie };
  const create = await request(app.baseUrl, '/api/lists', { method: 'POST', headers, body: { name: 'Zakupy weekendowe', dueDate: '2026-11-07' } }); assert.equal(create.status, 201);
  const list = (await create.json()).list;
  const add = await request(app.baseUrl, `/api/lists/${list.id}/items`, { method: 'POST', headers, body: { name: 'Jabłka', quantity: 4, unit: 'szt.' } }); assert.equal(add.status, 201); const item = (await add.json()).item;
  const toggle = await request(app.baseUrl, `/api/lists/${list.id}/items/${item.id}/toggle`, { method: 'PATCH', headers }); assert.equal((await toggle.json()).item.purchased, true);
  const delItem = await request(app.baseUrl, `/api/lists/${list.id}/items/${item.id}`, { method: 'DELETE', headers }); assert.equal(delItem.status, 204);
  const delList = await request(app.baseUrl, `/api/lists/${list.id}`, { method: 'DELETE', headers }); assert.equal(delList.status, 204);
  const logout = await request(app.baseUrl, '/api/auth/logout', { method: 'POST', headers }); assert.equal(logout.status, 204);
  const protectedRequest = await request(app.baseUrl, '/api/lists'); assert.equal(protectedRequest.status, 401);
});

test('unauthenticated user cannot access private API', async t => {
  const app = await testServer(); t.after(app.close);
  assert.equal((await request(app.baseUrl, '/api/lists')).status, 401);
  assert.equal((await request(app.baseUrl, '/api/auth/me')).status, 200);
});
