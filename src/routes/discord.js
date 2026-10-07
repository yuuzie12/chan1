const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// Gera código de vinculação
router.post('/link/start', requireAuth, (req, res) => {
  const db = getDb();
  const code = 'AC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare('UPDATE users SET discord_code=? WHERE id=?').run(code, req.user.id);
  res.json({
    code,
    channel_id: process.env.DISCORD_VERIFY_CHANNEL_ID || null,
    instructions: 'Envie o código no canal configurado. O bot irá confirmar.'
  });
});

// Endpoint que o bot chama para confirmar
router.post('/link/confirm', async (req, res) => {
  const secret = req.headers['x-bot-token'];
  if (!process.env.DISCORD_BOT_TOKEN || secret !== process.env.DISCORD_BOT_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { code, discord_id } = req.body;
  const db = getDb();
  const u = db.prepare('SELECT id FROM users WHERE discord_code=?').get(code);
  if (!u) return res.status(404).json({ error: 'Código inválido' });

  db.prepare('UPDATE users SET discord_id=?, discord_verified=1, discord_code=NULL WHERE id=?')
    .run(discord_id, u.id);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const u = db.prepare('SELECT discord_id, discord_verified FROM users WHERE id=?').get(req.user.id);
  res.json(u);
});

module.exports = router;
