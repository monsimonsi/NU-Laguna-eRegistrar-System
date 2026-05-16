const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), SALT_ROUNDS);
}

/**
 * @param {string} plain
 * @param {string} stored
 * @returns {Promise<boolean | 'legacy'>} true if valid bcrypt match; 'legacy' if plaintext match (migrate caller)
 */
async function verifyPassword(plain, stored) {
  const s = String(stored || '');
  if (!s) return false;
  if (s.startsWith('$2a$') || s.startsWith('$2b$') || s.startsWith('$2y$')) {
    return bcrypt.compare(String(plain), s);
  }
  if (String(plain) === s) return 'legacy';
  return false;
}

module.exports = {
  hashPassword,
  verifyPassword
};
