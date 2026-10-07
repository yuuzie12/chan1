const { getDb } = require('../config/database');

function attachUser(req, res, next) {
  req.user = null;
  if (req.session && req.session.userId) {
    const db = getDb();
    const u = db.prepare('SELECT id, username, role, banned FROM users WHERE id=?').get(req.session.userId);
    if (u && !u.banned) req.user = u;
    else if (u && u.banned) { req.session.destroy(()=>{}); }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Login necessário' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    next();
  };
}
module.exports = { attachUser, requireAuth, requireRole };
