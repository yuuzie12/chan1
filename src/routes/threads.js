const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { upload, processImage } = require('../services/uploads');
const { postLimiter } = require('../middleware/rateLimit');
const { sanitizeBody } = require('../middleware/sanitize');
const { requireRole } = require('../middleware/auth');
const realtime = require('../services/realtime');
const discord = require('../services/discord');

router.get('/:id', (req, res) => {
  const db = getDb();
  const thread = db.prepare(`
    SELECT t.*, b.slug AS board_slug, b.name AS board_name
    FROM threads t JOIN boards b ON b.id=t.board_id
    WHERE t.id=?
  `).get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Tópico não encontrado' });

  const posts = db.prepare(`
    SELECT * FROM posts WHERE thread_id=? ORDER BY created_at ASC
  `).all(thread.id);

  res.json({ thread, posts });
});

router.post('/', postLimiter, upload.single('image'), sanitizeBody(['subject','body']), async (req, res) => {
  const db = getDb();
  const { board_id, subject, body } = req.body;
  if (!board_id || !body) return res.status(400).json({ error: 'Dados incompletos' });

  const board = db.prepare('SELECT * FROM boards WHERE id=?').get(board_id);
  if (!board) return res.status(404).json({ error: 'Board inválido' });

  const image = await processImage(req.file);
  const info = db.prepare(`
    INSERT INTO threads (board_id, subject, body, image, user_id)
    VALUES (?,?,?,?,?)
  `).run(board.id, subject || '', body, image, req.user?.id || null);

  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(info.lastInsertRowid);
  realtime.emit('new_thread', `board:${board.id}`, thread);
  discord.notifyNewThread(board, thread);
  res.json({ ok: true, thread });
});

router.post('/:id/reply', postLimiter, upload.single('image'), sanitizeBody(['body']), async (req, res) => {
  const db = getDb();
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Tópico inexistente' });
  if (thread.is_locked) return res.status(403).json({ error: 'Tópico trancado' });

  const image = await processImage(req.file);
  const info = db.prepare('INSERT INTO posts (thread_id, body, image, user_id) VALUES (?,?,?,?)')
    .run(thread.id, req.body.body, image, req.user?.id || null);

  db.prepare('UPDATE threads SET bumped_at=? WHERE id=?').run(Math.floor(Date.now()/1000), thread.id);
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(info.lastInsertRowid);
  realtime.emit('new_post', `thread:${thread.id}`, post);
  res.json({ ok: true, post });
});

// Ações de moderação
router.post('/:id/lock', requireRole('admin','moderator'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE threads SET is_locked = 1 - is_locked WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
router.post('/:id/pin', requireRole('admin','moderator'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE threads SET is_pinned = 1 - is_pinned WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});
router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM threads WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Denúncia
router.post('/report', postLimiter, sanitizeBody(['reason']), (req, res) => {
  const db = getDb();
  const { target_type, target_id, reason } = req.body;
  db.prepare('INSERT INTO reports (target_type, target_id, reason, reporter_id) VALUES (?,?,?,?)')
    .run(target_type, target_id, reason, req.user?.id || null);
  discord.notifyReport({ target_type, target_id, reason });
  res.json({ ok: true });
});

// Catálogo
router.get('/board/:boardId/catalog', (req, res) => {
  const db = getDb();
  const threads = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM posts p WHERE p.thread_id=t.id) AS reply_count
    FROM threads t WHERE t.board_id=?
    ORDER BY t.bumped_at DESC LIMIT 100
  `).all(req.params.boardId);
  res.json(threads);
});

module.exports = router;
