require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { db, init } = require('../src/database');

async function run() {
  await init();

  const filePath = process.argv[2];
  const storyTitle = process.argv[3];
  const chapterNum = parseInt(process.argv[4]) || 1;

  if (!filePath || !storyTitle) {
    console.log('Usage: node scripts/import-txt.js <file.txt> <Story Title> [chapter number]');
    process.exit(1);
  }

  const content = fs.readFileSync(path.resolve(filePath), 'utf8').trim();

  // Check if story already exists
  let story = db.prepare('SELECT * FROM stories WHERE title = ?').get(storyTitle);

  if (!story) {
    const result = db.prepare('INSERT INTO stories (title) VALUES (?)').run(storyTitle);
    story = db.prepare('SELECT * FROM stories WHERE id = ?').get(result.lastInsertRowid);
    console.log(`Created story: "${story.title}" (id=${story.id})`);
  } else {
    console.log(`Story already exists: "${story.title}" (id=${story.id})`);
  }

  // Check if chapter already exists
  const existing = db.prepare('SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?').get(story.id, chapterNum);
  if (existing) {
    db.prepare('UPDATE chapters SET content = ?, updated_at = datetime(\'now\') WHERE id = ?').run(content, existing.id);
    console.log(`Updated chapter ${chapterNum}`);
  } else {
    db.prepare('INSERT INTO chapters (story_id, chapter_number, title, content) VALUES (?, ?, ?, ?)').run(story.id, chapterNum, `అధ్యాయం ${chapterNum}`, content);
    console.log(`Added chapter ${chapterNum} (${content.length} chars)`);
  }

  console.log(`\nDone! View at: http://localhost:3000/story.html?id=${story.id}`);
}

run().catch(e => { console.error(e); process.exit(1); });
