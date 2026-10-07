const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const favs = db.prepare(`
    SELECT t.*, b.slug AS board_slug FROM favorites f
    JOIN threads t ON t.id=f.thread_id
    JOIN boards b ON b.id=t.board_id
    WHERE f.user_id=? ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(favs);
});

router.post('/:threadId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, thread_id) VALUES (?,?)')
    .run(req.user.id, req.params.threadId);
  res.json({ ok: true });
});

router.delete('/:threadId', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM favorites WHERE user_id=? AND thread_id=?')
    .run(req.user.id, req.params.threadId);
  res.json({ ok: true });
});

module.exports = router;
