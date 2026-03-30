/**
 * Schedule a chapter to auto-publish at a given time (ET).
 * Usage: node scripts/schedule-publish.js <file.txt> <story_title> <chapter_number> <HH:MM> [YYYY-MM-DD]
 * Example: node scripts/schedule-publish.js data/maharshi_ch2.txt "మహర్షి" 2 22:52
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const [,, filePath, storyTitle, chapterNum, timeET, dateArg] = process.argv;

if (!filePath || !storyTitle || !chapterNum || !timeET) {
  console.log('Usage: node scripts/schedule-publish.js <file> <story_title> <chapter_num> <HH:MM> [YYYY-MM-DD]');
  process.exit(1);
}

const [hh, mm] = timeET.split(':').map(Number);

// Build target date in ET
const targetDateStr = dateArg || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const targetET = new Date(`${targetDateStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`);

// Convert ET to UTC by formatting as ET and parsing offset
const etFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false
});

// Get current ET offset by comparing now
const now = new Date();
const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
const offsetMs = now - nowET; // ET = UTC + offsetMs

// Target in UTC
const targetUTC = new Date(targetET.getTime() + offsetMs);

const msUntil = targetUTC - now;

if (msUntil < -60000) {
  console.error(`❌  Target time ${timeET} ET has already passed (${Math.abs(Math.round(msUntil/1000))}s ago).`);
  console.error(`    Run with tomorrow's date: node scripts/schedule-publish.js ... ${new Date(now.getTime()+86400000).toLocaleDateString('en-CA', {timeZone:'America/New_York'})}`);
  process.exit(1);
}

const minsUntil = Math.round(msUntil / 60000);
const secsUntil = Math.round(msUntil / 1000);
console.log(`\n⏰  Scheduled: "${storyTitle}" Chapter ${chapterNum}`);
console.log(`    File    : ${filePath}`);
console.log(`    Time    : ${timeET} ET  (in ${minsUntil > 0 ? minsUntil + ' min' : secsUntil + 's'})`);
console.log(`    Keep this terminal open.\n`);

setTimeout(async () => {
  console.log(`\n🚀  Publishing "${storyTitle}" Chapter ${chapterNum}...`);
  try {
    const http = require('http');
    const PORT = process.env.PORT || 3000;
    const content = fs.readFileSync(path.resolve(filePath), 'utf8').trim();

    // Helper to make HTTP requests to the running server
    function api(method, path, body) {
      return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = http.request({ hostname: 'localhost', port: PORT, path, method,
          headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
        }, res => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
      });
    }

    // Login as admin to get token
    const loginRes = await api('POST', '/api/auth/login', {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'changeme123'
    });
    if (!loginRes.body.token) throw new Error('Admin login failed');
    const token = loginRes.body.token;

    function apiAuth(method, path, body) {
      return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const req = http.request({ hostname: 'localhost', port: PORT, path, method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`,
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
        }, res => {
          let d = ''; res.on('data', c => d += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
      });
    }

    // Find or create story
    const storiesRes = await api('GET', '/api/stories');
    let story = storiesRes.body.find(s => s.title === storyTitle);
    if (!story) {
      const r = await apiAuth('POST', '/api/stories', { title: storyTitle });
      story = r.body;
      console.log(`  Created story: "${story.title}" (id=${story.id})`);
    }

    // Post the chapter
    const chRes = await apiAuth('POST', `/api/stories/${story.id}/chapters`, {
      chapter_number: parseInt(chapterNum),
      title: `అధ్యాయం ${chapterNum}`,
      content
    });

    if (chRes.status === 200 || chRes.status === 201) {
      console.log(`  Added chapter ${chapterNum} (${content.length} chars)`);
    } else {
      // Chapter might already exist — update it
      const chaptersRes = await api('GET', `/api/stories/${story.id}/chapters`);
      const existing = chaptersRes.body.chapters?.find(c => c.chapter_number === parseInt(chapterNum));
      if (existing) {
        await apiAuth('PUT', `/api/chapters/${existing.id}`, { content, title: `అధ్యాయం ${chapterNum}` });
        console.log(`  Updated chapter ${chapterNum}`);
      }
    }

    console.log(`\n✅  Published! View at: http://localhost:${PORT}/story.html?id=${story.id}`);
  } catch (err) {
    console.error('❌  Publish failed:', err.message);
  }
  process.exit(0);
}, Math.max(0, msUntil));
