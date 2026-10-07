const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const postLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: { error: 'Aguarde antes de postar novamente' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Tente mais tarde.' }
});

module.exports = { globalLimiter, postLimiter, loginLimiter };
