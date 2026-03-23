require('dotenv').config();
const express = require('express');
const path = require('path');
const { db, init } = require('./src/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function start() {
  await init();

  app.use('/api/auth', require('./src/routes/auth')(db));
  app.use('/api/users', require('./src/routes/users')(db));
  app.use('/api/stories', require('./src/routes/stories')(db));
  app.use('/api/chapters', require('./src/routes/chapters')(db));

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
