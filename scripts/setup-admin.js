require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, init } = require('../src/database');

async function setup() {
  await init();

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const hash = bcrypt.hashSync(password, 10);

  db.prepare('DELETE FROM admin').run();
  db.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run(username, hash);

  console.log('Admin account created:');
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password}`);
  console.log('\nIMPORTANT: Change the password in your .env file before deploying!');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
