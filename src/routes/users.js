const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function (db) {
  const router = express.Router();
  const SECRET = process.env.JWT_SECRET || 'change-this-secret';

  // Register
  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, password_hash);
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: 'user' }, SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  });

  // Login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: 'user' }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at } });
  });

  // Get current user
  router.get('/me', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Not logged in.' });
    try {
      const payload = jwt.verify(auth.replace('Bearer ', ''), SECRET);
      const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(payload.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json(user);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
    }
  });

  return router;
};
