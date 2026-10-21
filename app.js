const $ = selector => document.querySelector(selector);
const auth = $('#auth'); const workspace = $('#workspace'); const notice = $('#notice');
let currentUser = null; let lists = [];
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Błąd HTTP ${response.status}`);
  return data;
}
function message(text, isError = false) { notice.textContent = text; notice.className = `notice ${isError ? 'error' : 'success'}`; }
function clearMessage() { notice.textContent = ''; notice.className = ''; }
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function button(text, action, className = 'small-button') { const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; }
function formInput(placeholder, name, type = 'text') { const node = document.createElement('input'); node.name = name; node.placeholder = placeholder; node.type = type; node.required = true; node.setAttribute('aria-label', placeholder); return node; }
function renderLists() {
  const root = $('#lists'); root.replaceChildren();
  if (!lists.length) { root.append(element('div', 'empty', 'Nie masz jeszcze żadnej listy. Utwórz pierwszą powyżej.')); return; }
  for (const list of lists) {
    const card = element('article', 'list-card');
    const heading = element('h3', '', list.name); card.append(heading);
    card.append(element('p', 'muted', `${list.ownerId === currentUser.id ? 'Właściciel' : 'Lista udostępniona'}${list.dueDate ? ` · Zakupy do: ${list.dueDate}` : ''}`));
    const ul = element('ul', 'item-list');
    for (const item of list.items) {
      const li = element('li', 'item-row'); const check = document.createElement('input'); check.type = 'checkbox'; check.checked = item.purchased; check.setAttribute('aria-label', `Kupiono: ${item.name}`);
      check.addEventListener('change', async () => { try { await api(`/api/lists/${list.id}/items/${item.id}/toggle`, { method: 'PATCH' }); await refreshLists(); } catch (e) { message(e.message, true); check.checked = !check.checked; } });
      li.append(check, element('span', `item-name ${item.purchased ? 'purchased' : ''}`, `${item.name} — ${item.quantity} ${item.unit}`));
      if (list.ownerId === currentUser.id) li.append(button('Usuń', async () => { try { await api(`/api/lists/${list.id}/items/${item.id}`, { method: 'DELETE' }); await refreshLists(); } catch (e) { message(e.message, true); } }));
      ul.append(li);
    }
    if (!list.items.length) ul.append(element('li', 'muted', 'Lista nie zawiera jeszcze produktów.'));
    card.append(ul);
    if (list.ownerId === currentUser.id) {
      const addForm = element('form', 'compact-form');
      const name = formInput('Produkt', 'name'); name.maxLength = 100;
      const quantity = formInput('Ilość', 'quantity', 'number'); quantity.min = '0.001'; quantity.max = '100000'; quantity.step = '0.001'; quantity.value = '1';
      const unit = document.createElement('select'); unit.name = 'unit'; unit.setAttribute('aria-label', 'Jednostka');
      for (const u of ['szt.', 'g', 'kg', 'ml', 'l', 'opak.']) { const option = document.createElement('option'); option.value = u; option.textContent = u; unit.append(option); }
      const add = element('button', '', 'Dodaj'); add.type = 'submit'; addForm.append(name, quantity, unit, add);
      addForm.addEventListener('submit', async e => { e.preventDefault(); try { await api(`/api/lists/${list.id}/items`, { method: 'POST', body: JSON.stringify({ name: name.value, quantity: Number(quantity.value), unit: unit.value }) }); await refreshLists(); message('Dodano produkt.'); } catch (err) { message(err.message, true); } }); card.append(addForm);
      const shareForm = element('form', 'share-form'); const email = formInput('E-mail użytkownika', 'email', 'email'); email.maxLength = 254; const share = element('button', '', 'Udostępnij'); share.type = 'submit'; shareForm.append(email, share);
      shareForm.addEventListener('submit', async e => { e.preventDefault(); try { await api(`/api/lists/${list.id}/share`, { method: 'POST', body: JSON.stringify({ email: email.value }) }); await refreshLists(); message('Lista została udostępniona.'); } catch (err) { message(err.message, true); } }); card.append(shareForm);
      card.append(button('Usuń listę', async () => { if (!confirm(`Usunąć listę „${list.name}” wraz z produktami?`)) return; try { await api(`/api/lists/${list.id}`, { method: 'DELETE' }); await refreshLists(); message('Lista została usunięta.'); } catch (e) { message(e.message, true); } }, 'secondary small-button'));
    }
    root.append(card);
  }
}
async function refreshLists() { const result = await api('/api/lists'); lists = result.lists; renderLists(); }
async function showSession() {
  const result = await api('/api/auth/me'); currentUser = result.user;
  auth.classList.toggle('hidden', Boolean(currentUser)); workspace.classList.toggle('hidden', !currentUser); $('#logout').classList.toggle('hidden', !currentUser);
  if (currentUser) { $('#current-user').textContent = currentUser.email; await refreshLists(); } else { lists = []; $('#lists').replaceChildren(); }
}
for (const [formId, endpoint] of [['login-form', '/api/auth/login'], ['register-form', '/api/auth/register']]) {
  $(`#${formId}`).addEventListener('submit', async e => { e.preventDefault(); clearMessage(); const form = new FormData(e.currentTarget); try { await api(endpoint, { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); if (endpoint.endsWith('login')) { await showSession(); message('Zalogowano.'); } else { message('Konto utworzone. Zaloguj się, używając nowych danych.'); e.currentTarget.reset(); } } catch (err) { message(err.message, true); } });
}
$('#list-form').addEventListener('submit', async e => { e.preventDefault(); const form = new FormData(e.currentTarget); try { await api('/api/lists', { method: 'POST', body: JSON.stringify({ name: form.get('name'), dueDate: form.get('dueDate') || null }) }); e.currentTarget.reset(); await refreshLists(); message('Utworzono listę.'); } catch (err) { message(err.message, true); } });
$('#logout').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST' }); await showSession(); message('Wylogowano.'); } catch (e) { message(e.message, true); } });
$('#refresh').addEventListener('click', async () => { try { await refreshLists(); message('Dane odświeżone.'); } catch (e) { message(e.message, true); } });
showSession().catch(e => message(e.message, true));

// Odświeżenie współdzielonych list, aby zmiany innych użytkowników pojawiały się bez ręcznego przeładowania strony.
setInterval(() => { if (currentUser && !document.hidden) refreshLists().catch(() => {}); }, 3000);
