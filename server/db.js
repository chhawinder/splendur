const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'splendur.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    google_id TEXT UNIQUE,
    avatar TEXT,
    rating INTEGER DEFAULT 1500,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_played TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    badge_key TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_key),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    UNIQUE(user_id, date),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

function createGoogleUser(id, username, email, googleId, avatar) {
  const stmt = db.prepare('INSERT INTO users (id, username, email, google_id, avatar) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, username, email, googleId, avatar);
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function getUserByGoogleId(googleId) {
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}

function getUserById(id) {
  return db.prepare(`SELECT id, username, email, avatar, rating, wins, losses,
    total_games, current_streak, best_streak, last_played, created_at FROM users WHERE id = ?`).get(id);
}

function updateRating(id, rating, won) {
  const today = new Date().toISOString().split('T')[0];
  if (won) {
    db.prepare(`UPDATE users SET rating = ?, wins = wins + 1, total_games = total_games + 1,
      current_streak = current_streak + 1,
      best_streak = MAX(best_streak, current_streak + 1),
      last_played = ? WHERE id = ?`).run(rating, today, id);
  } else {
    db.prepare(`UPDATE users SET rating = ?, losses = losses + 1, total_games = total_games + 1,
      current_streak = 0, last_played = ? WHERE id = ?`).run(rating, today, id);
  }

  // Update daily stats
  const existing = db.prepare('SELECT * FROM daily_stats WHERE user_id = ? AND date = ?').get(id, today);
  if (existing) {
    if (won) {
      db.prepare('UPDATE daily_stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE user_id = ? AND date = ?').run(id, today);
    } else {
      db.prepare('UPDATE daily_stats SET games_played = games_played + 1 WHERE user_id = ? AND date = ?').run(id, today);
    }
  } else {
    db.prepare('INSERT INTO daily_stats (user_id, date, games_played, games_won) VALUES (?, ?, 1, ?)').run(id, today, won ? 1 : 0);
  }
}

function getDailyStats(userId, date) {
  return db.prepare('SELECT * FROM daily_stats WHERE user_id = ? AND date = ?').get(userId, date) || { games_played: 0, games_won: 0 };
}

function getWeeklyStats(userId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const rows = db.prepare('SELECT SUM(games_played) as total_played, SUM(games_won) as total_won FROM daily_stats WHERE user_id = ? AND date >= ?')
    .get(userId, weekAgo.toISOString().split('T')[0]);
  return { games_played: rows?.total_played || 0, games_won: rows?.total_won || 0 };
}

function getPlayStreak(userId) {
  // Count consecutive days played ending today
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const stat = db.prepare('SELECT * FROM daily_stats WHERE user_id = ? AND date = ?').get(userId, dateStr);
    if (stat && stat.games_played > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getUserBadges(userId) {
  return db.prepare('SELECT badge_key, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC').all(userId);
}

function awardBadge(userId, badgeKey) {
  try {
    db.prepare('INSERT OR IGNORE INTO badges (user_id, badge_key) VALUES (?, ?)').run(userId, badgeKey);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  createGoogleUser, getUserByEmail, getUserByGoogleId, getUserById,
  updateRating, getDailyStats, getWeeklyStats, getPlayStreak,
  getUserBadges, awardBadge
};
