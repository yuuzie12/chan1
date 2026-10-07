const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

router.get('/', (req, res) => {
  const db = getDb();
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ threads: [], posts: [] });

  const like = `%${q}%`;
  const threads = db.prepare(`
    SELECT t.*, b.slug AS board_slug FROM threads t
    JOIN boards b ON b.id=t.board_id
    WHERE t.subject LIKE ? OR t.body LIKE ?
    ORDER BY t.bumped_at DESC LIMIT 30
  `).all(like, like);

  const posts = db.prepare(`
    SELECT p.*, t.board_id, b.slug AS board_slug FROM posts p
    JOIN threads t ON t.id=p.thread_id
    JOIN boards b ON b.id=t.board_id
    WHERE p.body LIKE ?
    ORDER BY p.created_at DESC LIMIT 30
  `).all(like);

  res.json({ threads, posts });
});

module.exports = router;
