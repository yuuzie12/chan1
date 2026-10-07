const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const { getDb } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { hashPassword } = require('../middleware/security');
const discord = require('../services/discord');

router.use(requireRole('admin','moderator'));

function log(adminId, action, details, ip) {
  const db = getDb();
  db.prepare('INSERT INTO admin_logs (admin_id, action, details, ip) VALUES (?,?,?,?)')
    .run(adminId, action, details, ip);
}

router.get('/stats', (req, res) => {
  const db = getDb();
  res.json({
    boards: db.prepare('SELECT COUNT(*) c FROM boards').get().c,
    threads: db.prepare('SELECT COUNT(*) c FROM threads').get().c,
    posts: db.prepare('SELECT COUNT(*) c FROM posts').get().c,
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    reports_open: db.prepare('SELECT COUNT(*) c FROM reports WHERE resolved=0').get().c
  });
});

// Usuários
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT id, username, email, role, banned, ban_reason, discord_id, discord_verified, created_at
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

router.post('/users/:id/role', requireRole('admin'), (req, res) => {
  const db = getDb();
  const { role } = req.body;
  if (!['user','moderator','admin'].includes(role))
    return res.status(400).json({ error: 'Role inválido' });
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  log(req.user.id, 'set_role', `user ${req.params.id} -> ${role}`, req.ip);
  res.json({ ok: true });
});

router.post('/users/:id/ban', requireRole('admin','moderator'), (req, res) => {
  const db = getDb();
  const { reason, days } = req.body;
  const expires = days ? Math.floor(Date.now()/1000) + days*86400 : null;
  db.prepare('UPDATE users SET banned=1, ban_reason=? WHERE id=?').run(reason || 'Violação', req.params.id);
  db.prepare('INSERT INTO bans (user_id, reason, admin_id, expires_at) VALUES (?,?,?,?)')
    .run(req.params.id, reason || 'Violação', req.user.id, expires);
  log(req.user.id, 'ban_user', `user ${req.params.id}: ${reason}`, req.ip);
  discord.notifyBan({ user_id: req.params.id, reason });
  res.json({ ok: true });
});

router.post('/users/:id/unban', requireRole('admin','moderator'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET banned=0, ban_reason=NULL WHERE id=?').run(req.params.id);
  log(req.user.id, 'unban_user', `user ${req.params.id}`, req.ip);
  res.json({ ok: true });
});

router.post('/users/:id/reset-password', requireRole('admin'), async (req, res) => {
  const db = getDb();
  const hash = await hashPassword(req.body.password);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
  log(req.user.id, 'reset_password', `user ${req.params.id}`, req.ip);
  res.json({ ok: true });
});

// Logs
router.get('/logs', requireRole('admin'), (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT l.*, u.username AS admin_name FROM admin_logs l
    LEFT JOIN users u ON u.id=l.admin_id
    ORDER BY l.created_at DESC LIMIT 200
  `).all();
  res.json(logs);
});

// Relatórios
router.get('/reports', (req, res) => {
  const db = getDb();
  const reports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100').all();
  res.json(reports);
});
router.post('/reports/:id/resolve', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE reports SET resolved=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// 2FA
router.post('/2fa/setup', requireRole('admin'), (req, res) => {
  const secret = speakeasy.generateSecret({ name: `AnonChan (${req.user.username})` });
  const db = getDb();
  db.prepare('UPDATE users SET twofa_secret=? WHERE id=?').run(secret.base32, req.user.id);
  res.json({ ok: true, secret: secret.base32, otpauth_url: secret.otpauth_url });
});

router.post('/2fa/disable', requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET twofa_secret=NULL WHERE id=?').run(req.user.id);
  res.json({ ok: true });
});

// Config do Discord (Webhooks)
router.get('/discord/config', requireRole('admin'), (req, res) => {
  res.json({
    new_thread: process.env.DISCORD_WEBHOOK_NEW_THREAD || '',
    reports: process.env.DISCORD_WEBHOOK_REPORTS || '',
    new_user: process.env.DISCORD_WEBHOOK_NEW_USER || '',
    ban: process.env.DISCORD_WEBHOOK_BAN || '',
    admin_login: process.env.DISCORD_WEBHOOK_ADMIN_LOGIN || '',
    verify_channel: process.env.DISCORD_VERIFY_CHANNEL_ID || ''
  });
});

module.exports = router;
