const crypto = require('node:crypto');

const COMMON_UNITS = new Set(['szt.', 'g', 'kg', 'ml', 'l', 'opak.']);

function validateEmail(email) {
  return typeof email === 'string' && email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 10 && password.length <= 128;
}

function validateListName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 100;
}

function validateItem(input) {
  const errors = [];
  if (!input || typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 100) {
    errors.push('Nazwa produktu jest wymagana i musi mieć od 1 do 100 znaków.');
  }
  const quantity = input && input.quantity !== undefined ? Number(input.quantity) : 1;
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || !Number.isInteger(quantity * 1000)) {
    errors.push('Ilość musi być dodatnią liczbą nie większą niż 100000, z maksymalnie trzema miejscami po przecinku.');
  }
  const unit = input && input.unit !== undefined ? input.unit : 'szt.';
  if (!COMMON_UNITS.has(unit)) errors.push('Nieobsługiwana jednostka produktu.');
  return { valid: errors.length === 0, errors, value: errors.length ? null : { name: input.name.trim(), quantity, unit } };
}

function canManageList(list, userId) { return Boolean(list && list.ownerId === userId); }
function canAccessList(list, userId) { return Boolean(list && (list.ownerId === userId || list.sharedWith.includes(userId))); }

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function safeUser(user) { return { id: user.id, email: user.email, createdAt: user.createdAt }; }

module.exports = { COMMON_UNITS, validateEmail, validatePassword, validateListName, validateItem, canManageList, canAccessList, hashPassword, verifyPassword, safeUser };
