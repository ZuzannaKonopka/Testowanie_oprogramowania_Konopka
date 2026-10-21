const test = require('node:test');
const assert = require('node:assert/strict');
const { testServer, request, register, login } = require('./helpers');
const { JsonStore } = require('../src/store');

test('REST integration: register, login, create list, add item and persist it', async t => {
  const app = await testServer(); t.after(app.close);
  const reg = await register(app.baseUrl, 'owner@example.com'); assert.equal(reg.res.status, 201);
  const auth = await login(app.baseUrl, 'owner@example.com'); assert.equal(auth.res.status, 200);
  const headers = { Cookie: auth.cookie };
  const created = await request(app.baseUrl, '/api/lists', { method: 'POST', headers, body: { name: 'Zakupy', dueDate: '2026-11-01' } });
  assert.equal(created.status, 201); const list = (await created.json()).list;
  const added = await request(app.baseUrl, `/api/lists/${list.id}/items`, { method: 'POST', headers, body: { name: 'Mleko', quantity: 2, unit: 'l' } });
  assert.equal(added.status, 201);
  const fetched = await request(app.baseUrl, `/api/lists/${list.id}`, { headers });
  assert.equal(fetched.status, 200); assert.equal((await fetched.json()).list.items[0].name, 'Mleko');
  assert.equal(app.store.data.lists[0].items.length, 1);
  const reopenedStore = new JsonStore(app.dataDir);
  assert.equal(reopenedStore.data.lists[0].items[0].name, 'Mleko');
  assert.equal(reopenedStore.data.users[0].email, 'owner@example.com');
});

test('REST integration rejects malformed JSON content type and invalid item data', async t => {
  const app = await testServer(); t.after(app.close);
  await register(app.baseUrl, 'owner@example.com'); const auth = await login(app.baseUrl, 'owner@example.com');
  const headers = { Cookie: auth.cookie };
  const created = await request(app.baseUrl, '/api/lists', { method: 'POST', headers, body: { name: 'Lista' } }); const list = (await created.json()).list;
  const invalid = await request(app.baseUrl, `/api/lists/${list.id}/items`, { method: 'POST', headers, body: { name: '', quantity: 0, unit: 'szt.' } });
  assert.equal(invalid.status, 400);
  const wrongType = await fetch(`${app.baseUrl}/api/lists`, { method: 'POST', headers: { Cookie: auth.cookie, 'Content-Type': 'text/plain' }, body: 'hello' });
  assert.equal(wrongType.status, 415);
});

test('shared user may toggle purchased status but cannot add or delete items', async t => {
  const app = await testServer(); t.after(app.close);
  await register(app.baseUrl, 'owner@example.com'); await register(app.baseUrl, 'guest@example.com');
  const owner = await login(app.baseUrl, 'owner@example.com'); const guest = await login(app.baseUrl, 'guest@example.com');
  const oh = { Cookie: owner.cookie }; const gh = { Cookie: guest.cookie };
  const response = await request(app.baseUrl, '/api/lists', { method: 'POST', headers: oh, body: { name: 'Wspólna lista' } }); const list = (await response.json()).list;
  const itemRes = await request(app.baseUrl, `/api/lists/${list.id}/items`, { method: 'POST', headers: oh, body: { name: 'Chleb' } }); const item = (await itemRes.json()).item;
  const shared = await request(app.baseUrl, `/api/lists/${list.id}/share`, { method: 'POST', headers: oh, body: { email: 'guest@example.com' } }); assert.equal(shared.status, 200);
  const toggle = await request(app.baseUrl, `/api/lists/${list.id}/items/${item.id}/toggle`, { method: 'PATCH', headers: gh }); assert.equal(toggle.status, 200); assert.equal((await toggle.json()).item.purchased, true);
  const add = await request(app.baseUrl, `/api/lists/${list.id}/items`, { method: 'POST', headers: gh, body: { name: 'Masło' } }); assert.equal(add.status, 403);
  const remove = await request(app.baseUrl, `/api/lists/${list.id}/items/${item.id}`, { method: 'DELETE', headers: gh }); assert.equal(remove.status, 403);
});
