const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'stories.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`PRAGMA foreign_keys = ON`);

  _db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      UNIQUE(story_id, chapter_number)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(chapter_id, user_id),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  save();
}

function save() {
  if (!_db) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Better-sqlite3-compatible API wrapper
const db = {
  pragma(p) {
    _db.run(`PRAGMA ${p}`);
  },

  exec(sql) {
    _db.run(sql);
    save();
  },

  prepare(sql) {
    return {
      run(...args) {
        const stmt = _db.prepare(sql);
        try {
          stmt.run(args.length ? args : []);
        } finally {
          stmt.free();
        }
        const lastInsertRowid = _db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] ?? 0;
        const changes = _db.exec('SELECT changes() as c')[0]?.values[0]?.[0] ?? 0;
        save();
        return { lastInsertRowid, changes };
      },

      get(...args) {
        const stmt = _db.prepare(sql);
        try {
          if (args.length) stmt.bind(args);
          return stmt.step() ? stmt.getAsObject() : undefined;
        } finally {
          stmt.free();
        }
      },

      all(...args) {
        const stmt = _db.prepare(sql);
        const rows = [];
        try {
          if (args.length) stmt.bind(args);
          while (stmt.step()) rows.push(stmt.getAsObject());
          return rows;
        } finally {
          stmt.free();
        }
      },
    };
  },
};

module.exports = { db, init };
