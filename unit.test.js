const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEmail, validatePassword, validateListName, validateItem, canManageList, canAccessList, hashPassword, verifyPassword } = require('../src/domain');

test('validateEmail accepts normal email and rejects malformed input', () => {
  assert.equal(validateEmail('test@example.com'), true);
  assert.equal(validateEmail(' test@example.com '), true);
  assert.equal(validateEmail('not-an-email'), false);
  assert.equal(validateEmail('a@b'), false);
  assert.equal(validateEmail(null), false);
});
test('validatePassword enforces length boundaries', () => {
  assert.equal(validatePassword('1234567890'), true);
  assert.equal(validatePassword('short'), false);
  assert.equal(validatePassword('x'.repeat(129)), false);
  assert.equal(validatePassword(null), false);
});
test('validateListName trims whitespace and checks length', () => {
  assert.equal(validateListName('  Zakupy  '), true);
  assert.equal(validateListName('   '), false);
  assert.equal(validateListName('x'.repeat(101)), false);
});
test('validateItem returns normalized valid item', () => {
  assert.deepEqual(validateItem({ name: ' Mleko ', quantity: 2, unit: 'l' }), { valid: true, errors: [], value: { name: 'Mleko', quantity: 2, unit: 'l' } });
  assert.equal(validateItem({ name: 'Chleb' }).valid, true);
});
test('validateItem rejects missing names, non-positive quantity and unknown units', () => {
  assert.equal(validateItem({ name: ' ' }).valid, false);
  assert.equal(validateItem({ name: 'Chleb', quantity: 0 }).valid, false);
  assert.equal(validateItem({ name: 'Chleb', quantity: -1 }).valid, false);
  assert.equal(validateItem({ name: 'Chleb', quantity: 1, unit: 'foobar' }).valid, false);
  assert.equal(validateItem({ name: 'x'.repeat(101) }).valid, false);
});
test('ownership and shared access rules are distinct', () => {
  const list = { ownerId: 'owner', sharedWith: ['guest'] };
  assert.equal(canManageList(list, 'owner'), true);
  assert.equal(canManageList(list, 'guest'), false);
  assert.equal(canAccessList(list, 'guest'), true);
  assert.equal(canAccessList(list, 'stranger'), false);
  assert.equal(canAccessList(null, 'owner'), false);
});
test('password hashes verify only the original password', () => {
  const stored = hashPassword('PoprawneHaslo123!');
  assert.match(stored, /^[a-f0-9]+:[a-f0-9]{128}$/);
  assert.equal(verifyPassword('PoprawneHaslo123!', stored), true);
  assert.equal(verifyPassword('niepoprawne', stored), false);
  assert.equal(verifyPassword(null, stored), false);
});
