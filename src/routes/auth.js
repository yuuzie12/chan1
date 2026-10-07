const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { getDb } = require('../config/database');
const { hashPassword, verifyPassword, sanitize } = require('../middleware/security');
const { loginLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const discord = require('../services/discord');

router.post('/register', loginLimiter, async (req, res) => {
  const db = getDb();
  const { username, password, email } = req.body;
  if (!username || !password || username.length < 3 || password.length < 6)
    return res.status(400).json({ error: 'Dados inválidos (usuário 3+, senha 6+)' });
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: 'Usuário já existe' });

  const hash = await hashPassword(password);
  const info = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?,?,?)')
    .run(username, email || null, hash);
  req.session.userId = info.lastInsertRowid;

  const user = { id: info.lastInsertRowid, username };
  discord.notifyNewUser(user);
  res.json({ ok: true, user: { id: user.id, username, role: 'user' } });
});

router.post('/login', loginLimiter, async (req, res) => {
  const db = getDb();
  const { username, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!u) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (u.banned) return res.status(403).json({ error: 'Conta banida: ' + (u.ban_reason||'') });

  const ok = await verifyPassword(u.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  req.session.userId = u.id;
  res.json({ ok: true, user: { id: u.id, username: u.username, role: u.role } });
});

router.post('/admin-login', loginLimiter, async (req, res) => {
  const db = getDb();
  const { username, password, totp } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!u || !['admin','moderator'].includes(u.role))
    return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = await verifyPassword(u.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
  if (u.banned) return res.status(403).json({ error: 'Conta banida' });

  if (u.twofa_secret) {
    if (!totp) return res.status(401).json({ error: '2FA necessário', need2fa: true });
    const valid = speakeasy.totp.verify({
      secret: u.twofa_secret,
      encoding: 'base32',
      token: totp,
      window: 1
    });
    if (!valid) return res.status(401).json({ error: 'Código 2FA inválido' });
  }

  req.session.userId = u.id;
  db.prepare('INSERT INTO admin_logs (admin_id, action, details, ip) VALUES (?,?,?,?)')
    .run(u.id, 'admin_login', 'Login administrativo', req.ip);
  discord.notifyAdminLogin(u, req.ip);
  res.json({ ok: true, user: { id: u.id, username: u.username, role: u.role } });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

// Recuperação de senha
router.post('/forgot', async (req, res) => {
  const db = getDb();
  const { email } = req.body;
  const u = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (u) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Math.floor(Date.now()/1000) + 3600;
    db.prepare('UPDATE users SET reset_token=?, reset_expires=? WHERE id=?')
      .run(token, expires, u.id);
    // Envio de e-mail (configure SMTP)
    try {
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await t.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Redefinição de senha',
        text: `Acesse: /reset.html?token=${token}`
      });
    } catch(e) { console.error('Email erro:', e.message); }
  }
  res.json({ ok: true });
});

router.post('/reset', async (req, res) => {
  const db = getDb();
  const { token, password } = req.body;
  const u = db.prepare('SELECT id FROM users WHERE reset_token=? AND reset_expires > ?')
    .get(token, Math.floor(Date.now()/1000));
  if (!u) return res.status(400).json({ error: 'Token inválido' });
  const hash = await hashPassword(password);
  db.prepare('UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?')
    .run(hash, u.id);
  res.json({ ok: true });
});

module.exports = router;
