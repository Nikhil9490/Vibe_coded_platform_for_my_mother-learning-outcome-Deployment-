require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db, init } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureAdmin() {
  const existing = db.prepare('SELECT id FROM admin LIMIT 1').get();
  if (!existing) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run(username, hash);
    console.log(`Admin account created: ${username}`);
  }
}

async function start() {
  await init();
  await ensureAdmin();

  app.use('/api/auth', require('./src/routes/auth')(db));
  app.use('/api/users', require('./src/routes/users')(db));
  app.use('/api/stories', require('./src/routes/stories')(db));
  app.use('/api/chapters', require('./src/routes/chapters')(db));
  app.use('/api/engage', require('./src/routes/engagement')(db));
  app.use('/api/chat', require('./src/routes/chat')(db));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
