const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = function (db) {
  const router = express.Router();
  const SECRET = process.env.JWT_SECRET || 'change-this-secret';

  function requireLoggedIn(req, res, next) {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Login required' });
    try { req.user = jwt.verify(token, SECRET); next(); }
    catch { res.status(403).json({ error: 'Invalid or expired token' }); }
  }

  // GET /api/chat/messages?after=<id>  — fetch latest 60, or only newer than `after`
  router.get('/messages', requireLoggedIn, (req, res) => {
    const after = parseInt(req.query.after) || 0;
    const messages = after
      ? db.prepare(`
          SELECT m.id, m.content, m.created_at, m.user_id, u.name as user_name
          FROM messages m JOIN users u ON u.id = m.user_id
          WHERE m.id > ? ORDER BY m.id ASC
        `).all(after)
      : db.prepare(`
          SELECT m.id, m.content, m.created_at, m.user_id, u.name as user_name
          FROM messages m JOIN users u ON u.id = m.user_id
          ORDER BY m.id DESC LIMIT 60
        `).all().reverse();
    res.json(messages);
  });

  // POST /api/chat/messages
  router.post('/messages', requireLoggedIn, (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
    if (content.length > 500) return res.status(400).json({ error: 'Max 500 characters' });

    const result = db.prepare(
      'INSERT INTO messages (user_id, content) VALUES (?, ?)'
    ).run(req.user.id, content.trim());

    const message = db.prepare(`
      SELECT m.id, m.content, m.created_at, m.user_id, u.name as user_name
      FROM messages m JOIN users u ON u.id = m.user_id WHERE m.id = ?
    `).get(result.lastInsertRowid);
    res.status(201).json(message);
  });

  // DELETE /api/chat/messages/:id  — own message only
  router.delete('/messages/:id', requireLoggedIn, (req, res) => {
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.user_id !== req.user.id) return res.status(403).json({ error: 'Cannot delete another user\'s message' });
    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  });

  return router;
};
