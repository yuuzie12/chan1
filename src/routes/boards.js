const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/sanitize');

router.get('/', (req, res) => {
  const db = getDb();
  const boards = db.prepare(`
    SELECT b.*, 
      (SELECT COUNT(*) FROM threads t WHERE t.board_id=b.id) AS thread_count
    FROM boards b ORDER BY b.slug ASC
  `).all();
  res.json(boards);
});

router.get('/:slug', (req, res) => {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE slug=?').get(req.params.slug);
  if (!board) return res.status(404).json({ error: 'Board não encontrado' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 20;
  const threads = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM posts p WHERE p.thread_id=t.id) AS reply_count
    FROM threads t WHERE t.board_id=?
    ORDER BY t.is_pinned DESC, t.bumped_at DESC
    LIMIT ? OFFSET ?
  `).all(board.id, perPage, (page-1)*perPage);

  res.json({ board, threads, page });
});

router.post('/', requireRole('admin'), sanitizeBody(['slug','name','description']), (req, res) => {
  const db = getDb();
  const { slug, name, description } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'Slug e nome obrigatórios' });
  try {
    const info = db.prepare('INSERT INTO boards (slug, name, description) VALUES (?,?,?)')
      .run(slug, name, description || '');
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch(e) {
    res.status(400).json({ error: 'Slug já existe' });
  }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM boards WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
