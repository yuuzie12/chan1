const argon2 = require('argon2');
const xss = require('xss');

async function hashPassword(pw) { return argon2.hash(pw, { type: argon2.argon2id }); }
async function verifyPassword(hash, pw) {
  try { return await argon2.verify(hash, pw); } catch { return false; }
}
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return xss(str, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
}
module.exports = { hashPassword, verifyPassword, sanitize };
