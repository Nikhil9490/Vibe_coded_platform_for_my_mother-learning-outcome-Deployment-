const express = require('express');
const { requireAuth } = require('../middleware/auth');

module.exports = function (db) {
  const router = express.Router();

  // Admin: get single chapter (for editing)
  router.get('/:id', requireAuth, (req, res) => {
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    res.json(chapter);
  });

  // Admin: update a chapter
  router.put('/:id', requireAuth, (req, res) => {
    const { title, content, chapter_number } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const newNum = chapter_number || chapter.chapter_number;

    try {
      db.prepare(`
        UPDATE chapters SET title = ?, content = ?, chapter_number = ?, updated_at = datetime('now') WHERE id = ?
      `).run(title || null, content, newNum, req.params.id);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        return res.status(409).json({ error: `Chapter ${newNum} already exists for this story` });
      }
      throw e;
    }

    res.json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id));
  });

  // Admin: delete a chapter
  router.delete('/:id', requireAuth, (req, res) => {
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.id);
    res.json({ message: 'Chapter deleted' });
  });

  return router;
};
