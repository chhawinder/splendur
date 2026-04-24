const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '..', 'splendur.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rating INTEGER DEFAULT 1500,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

function createUser(id, username, hashedPassword) {
  const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
  stmt.run(id, username, hashedPassword);
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function getUserById(id) {
  return db.prepare('SELECT id, username, rating, wins, losses FROM users WHERE id = ?').get(id);
}

function updateRating(id, rating, won) {
  if (won) {
    db.prepare('UPDATE users SET rating = ?, wins = wins + 1 WHERE id = ?').run(rating, id);
  } else {
    db.prepare('UPDATE users SET rating = ?, losses = losses + 1 WHERE id = ?').run(rating, id);
  }
}

module.exports = { createUser, getUserByUsername, getUserById, updateRating };
