const { csrfSync } = require('csrf-sync');
const { generateToken, csrfSynchronisedProtection } = csrfSync({
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body._csrf
});

function csrfMiddleware(req, res, next) {
  // Só valida em métodos mutantes de API
  if (['POST','PUT','PATCH','DELETE'].includes(req.method) && req.path.startsWith('/api')) {
    return csrfSynchronisedProtection(req, res, next);
  }
  // Gera token disponível
  if (req.session && !req.session.csrfToken) req.session.csrfToken = generateToken(req);
  next();
}

function csrfTokenEndpoint(req, res) {
  if (!req.session.csrfToken) req.session.csrfToken = generateToken(req);
  res.json({ token: req.session.csrfToken });
}
module.exports = { csrfMiddleware, csrfTokenEndpoint };
