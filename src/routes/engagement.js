const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function (db) {
  const router = express.Router();
  const SECRET = process.env.JWT_SECRET || 'change-this-secret';

  function optionalAuth(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (token) { try { req.user = jwt.verify(token, SECRET); } catch {} }
    next();
  }

  function requireLoggedIn(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Login required' });
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { res.status(403).json({ error: 'Invalid or expired token' }); }
  }

  // GET /api/engage/chapters/:id/likes
  router.get('/chapters/:id/likes', optionalAuth, (req, res) => {
    const { id } = req.params;
    const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE chapter_id = ?').get(id).c;
    const liked = req.user
      ? !!db.prepare('SELECT id FROM likes WHERE chapter_id = ? AND user_id = ?').get(id, req.user.id)
      : false;
    res.json({ count, liked });
  });

  // POST /api/engage/chapters/:id/like  (toggle)
  router.post('/chapters/:id/like', requireLoggedIn, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const existing = db.prepare('SELECT id FROM likes WHERE chapter_id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    } else {
      db.prepare('INSERT INTO likes (chapter_id, user_id) VALUES (?, ?)').run(id, userId);
    }
    const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE chapter_id = ?').get(id).c;
    res.json({ count, liked: !existing });
  });

  // GET /api/engage/chapters/:id/comments
  router.get('/chapters/:id/comments', (req, res) => {
    const comments = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.user_id, u.name as user_name
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.chapter_id = ? ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  // POST /api/engage/chapters/:id/comments
  router.post('/chapters/:id/comments', requireLoggedIn, (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    if (content.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });

    const result = db.prepare(
      'INSERT INTO comments (chapter_id, user_id, content) VALUES (?, ?, ?)'
    ).run(req.params.id, req.user.id, content.trim());

    const comment = db.prepare(`
      SELECT c.id, c.content, c.created_at, c.user_id, u.name as user_name
      FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(comment);
  });

  // DELETE /api/engage/comments/:id  (own comment only)
  router.delete('/comments/:id', requireLoggedIn, (req, res) => {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: 'Cannot delete another user\'s comment' });
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  });

  return router;
};
