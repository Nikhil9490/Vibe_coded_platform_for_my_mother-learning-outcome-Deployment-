const express = require('express');
const { requireAuth } = require('../middleware/auth');

module.exports = function (db) {
  const router = express.Router();

  // Public: list all stories
  router.get('/', (req, res) => {
    const stories = db.prepare(`
      SELECT s.*, COUNT(c.id) as chapter_count, MAX(c.created_at) as last_updated
      FROM stories s
      LEFT JOIN chapters c ON s.id = c.story_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(stories);
  });

  // Public: get a single story
  router.get('/:id', (req, res) => {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json(story);
  });

  // Public: list chapters for a story (no content)
  router.get('/:id/chapters', (req, res) => {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const chapters = db.prepare(`
      SELECT id, story_id, chapter_number, title, created_at, updated_at
      FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC
    `).all(req.params.id);

    res.json({ story, chapters });
  });

  // Public: get a single chapter with content + prev/next
  router.get('/:storyId/chapters/:chapterNum', (req, res) => {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const chapter = db.prepare(`
      SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?
    `).get(req.params.storyId, req.params.chapterNum);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const prev = db.prepare(`
      SELECT chapter_number FROM chapters WHERE story_id = ? AND chapter_number < ?
      ORDER BY chapter_number DESC LIMIT 1
    `).get(req.params.storyId, chapter.chapter_number);

    const next = db.prepare(`
      SELECT chapter_number FROM chapters WHERE story_id = ? AND chapter_number > ?
      ORDER BY chapter_number ASC LIMIT 1
    `).get(req.params.storyId, chapter.chapter_number);

    res.json({
      story,
      chapter,
      prev: prev ? prev.chapter_number : null,
      next: next ? next.chapter_number : null,
    });
  });

  // Admin: create story
  router.post('/', requireAuth, (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = db.prepare(`
      INSERT INTO stories (title, description) VALUES (?, ?)
    `).run(title, description || null);

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(story);
  });

  // Admin: update story
  router.put('/:id', requireAuth, (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    db.prepare(`
      UPDATE stories SET title = ?, description = ?, updated_at = datetime('now') WHERE id = ?
    `).run(title, description || null, req.params.id);

    res.json(db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id));
  });

  // Admin: delete story
  router.delete('/:id', requireAuth, (req, res) => {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Story deleted' });
  });

  // Admin: add chapter to a story
  router.post('/:id/chapters', requireAuth, (req, res) => {
    const { title, content, chapter_number } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    let chapterNum = chapter_number;
    if (!chapterNum) {
      const last = db.prepare('SELECT MAX(chapter_number) as max FROM chapters WHERE story_id = ?').get(req.params.id);
      chapterNum = (last.max || 0) + 1;
    }

    try {
      const result = db.prepare(`
        INSERT INTO chapters (story_id, chapter_number, title, content) VALUES (?, ?, ?, ?)
      `).run(req.params.id, chapterNum, title || null, content);

      const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(chapter);
    } catch (e) {
      if (e.message && e.message.includes('UNIQUE')) {
        return res.status(409).json({ error: `Chapter ${chapterNum} already exists` });
      }
      throw e;
    }
  });

  return router;
};
