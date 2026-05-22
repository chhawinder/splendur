const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_URL ? { ssl: { rejectUnauthorized: false } } : {}),
});

async function initDb() {
  await pool.query(`
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
      created_at TIMESTAMP DEFAULT NOW(),
      cpu_games INTEGER DEFAULT 0
    )
  `);

  // Add cpu_games column if missing (PostgreSQL 9.6+)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cpu_games INTEGER DEFAULT 0`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      badge_key TEXT NOT NULL,
      earned_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, badge_key)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `);

  // Persistent game logs table — survives server restarts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      level TEXT DEFAULT 'INFO',
      message TEXT NOT NULL
    )
  `);

  // Create index for fast time-range queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_game_logs_created_at ON game_logs (created_at DESC)
  `);

  // Auto-cleanup: delete logs older than 7 days to keep DB lean
  await pool.query(`DELETE FROM game_logs WHERE created_at < NOW() - INTERVAL '7 days'`);

  // Persistent game state table — games survive server restarts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS active_games (
      id TEXT PRIMARY KEY,
      lobby_id TEXT,
      state JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Clean up stale games older than 2 hours (abandoned games)
  await pool.query(`DELETE FROM active_games WHERE updated_at < NOW() - INTERVAL '2 hours'`);
}

async function createGoogleUser(id, username, email, googleId, avatar) {
  await pool.query(
    'INSERT INTO users (id, username, email, google_id, avatar) VALUES ($1, $2, $3, $4, $5)',
    [id, username, email, googleId, avatar]
  );
}

async function getUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function getUserByGoogleId(googleId) {
  const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return result.rows[0];
}

async function getUserById(id) {
  const result = await pool.query(
    `SELECT id, username, email, avatar, rating, wins, losses,
      total_games, cpu_games, current_streak, best_streak, last_played, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateRating(id, rating, won) {
  const today = new Date().toISOString().split('T')[0];
  if (won) {
    await pool.query(
      `UPDATE users SET rating = $1, wins = wins + 1, total_games = total_games + 1,
        current_streak = current_streak + 1,
        best_streak = GREATEST(best_streak, current_streak + 1),
        last_played = $2 WHERE id = $3`,
      [rating, today, id]
    );
  } else {
    await pool.query(
      `UPDATE users SET rating = $1, losses = losses + 1, total_games = total_games + 1,
        current_streak = 0, last_played = $2 WHERE id = $3`,
      [rating, today, id]
    );
  }

  // Update daily stats — single upsert
  await pool.query(
    `INSERT INTO daily_stats (user_id, date, games_played, games_won)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (user_id, date) DO UPDATE SET
       games_played = daily_stats.games_played + 1,
       games_won = daily_stats.games_won + $3`,
    [id, today, won ? 1 : 0]
  );
}

async function getDailyStats(userId, date) {
  const result = await pool.query(
    'SELECT * FROM daily_stats WHERE user_id = $1 AND date = $2',
    [userId, date]
  );
  return result.rows[0] || { games_played: 0, games_won: 0 };
}

async function getWeeklyStats(userId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const result = await pool.query(
    'SELECT SUM(games_played) as total_played, SUM(games_won) as total_won FROM daily_stats WHERE user_id = $1 AND date >= $2',
    [userId, weekAgo.toISOString().split('T')[0]]
  );
  const row = result.rows[0];
  return { games_played: parseInt(row?.total_played) || 0, games_won: parseInt(row?.total_won) || 0 };
}

async function getPlayStreak(userId) {
  // Count consecutive days played ending today — single query
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT date FROM daily_stats
     WHERE user_id = $1 AND games_played > 0 AND date <= $2
     ORDER BY date DESC LIMIT 365`,
    [userId, today]
  );
  let streak = 0;
  const now = new Date(today);
  for (const row of result.rows) {
    const expected = new Date(now);
    expected.setDate(expected.getDate() - streak);
    const expectedStr = expected.toISOString().split('T')[0];
    if (row.date === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function getUserBadges(userId) {
  const result = await pool.query(
    'SELECT badge_key, earned_at FROM badges WHERE user_id = $1 ORDER BY earned_at DESC',
    [userId]
  );
  return result.rows;
}

async function awardBadge(userId, badgeKey) {
  try {
    await pool.query(
      'INSERT INTO badges (user_id, badge_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, badgeKey]
    );
    return true;
  } catch {
    return false;
  }
}

async function recordGamePlayed(id, vsCPU = false) {
  const today = new Date().toISOString().split('T')[0];
  if (vsCPU) {
    await pool.query(
      `UPDATE users SET total_games = total_games + 1, cpu_games = cpu_games + 1, last_played = $1 WHERE id = $2`,
      [today, id]
    );
  } else {
    await pool.query(
      `UPDATE users SET total_games = total_games + 1, last_played = $1 WHERE id = $2`,
      [today, id]
    );
  }

  // Single upsert for daily stats
  await pool.query(
    `INSERT INTO daily_stats (user_id, date, games_played, games_won)
     VALUES ($1, $2, 1, 0)
     ON CONFLICT (user_id, date) DO UPDATE SET
       games_played = daily_stats.games_played + 1`,
    [id, today]
  );
}

async function getAllUsers() {
  const result = await pool.query(
    'SELECT username, created_at, total_games, wins, rating FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

async function updateAvatar(id, avatar) {
  await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, id]);
}

async function updateUsername(id, username) {
  await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username, id]);
}

async function getLeaderboardAllTime() {
  const result = await pool.query(
    'SELECT id, username, avatar, rating, wins, losses, total_games, current_streak, best_streak FROM users ORDER BY rating DESC LIMIT 50'
  );
  return result.rows;
}

async function getLeaderboardByPeriod(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const result = await pool.query(
    `SELECT u.id, u.username, u.avatar, u.rating, u.wins, u.losses, u.total_games,
            u.current_streak, u.best_streak,
            COALESCE(SUM(ds.games_won), 0) AS period_wins
     FROM daily_stats ds
     JOIN users u ON u.id = ds.user_id
     WHERE ds.date >= $1
     GROUP BY u.id, u.username, u.avatar, u.rating, u.wins, u.losses, u.total_games,
              u.current_streak, u.best_streak
     ORDER BY period_wins DESC
     LIMIT 50`,
    [cutoffStr]
  );
  return result.rows;
}

// ============ GAME STATE PERSISTENCE ============

async function saveGameState(gameId, lobbyId, state) {
  try {
    await pool.query(
      `INSERT INTO active_games (id, lobby_id, state, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET state = $3, updated_at = NOW()`,
      [gameId, lobbyId || null, JSON.stringify(state)]
    );
  } catch { /* fire-and-forget — don't crash the server */ }
}

async function loadAllGameStates() {
  try {
    const result = await pool.query('SELECT id, lobby_id, state FROM active_games');
    return result.rows.map(r => ({ id: r.id, lobbyId: r.lobby_id, state: r.state }));
  } catch { return []; }
}

async function deleteGameState(gameId) {
  try {
    await pool.query('DELETE FROM active_games WHERE id = $1', [gameId]);
  } catch { /* ignore */ }
}

// Fire-and-forget log insert — never throws
async function insertGameLog(message, level = 'INFO') {
  try {
    await pool.query(
      'INSERT INTO game_logs (message, level) VALUES ($1, $2)',
      [message, level]
    );
  } catch { /* ignore DB errors for logging — don't crash the server */ }
}

// Query persisted logs — returns most recent first
async function getGameLogs(limit = 200, level = null, hoursBack = 24) {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  let query, params;
  if (level) {
    query = 'SELECT created_at, level, message FROM game_logs WHERE created_at >= $1 AND level = $2 ORDER BY created_at DESC LIMIT $3';
    params = [cutoff, level, limit];
  } else {
    query = 'SELECT created_at, level, message FROM game_logs WHERE created_at >= $1 ORDER BY created_at DESC LIMIT $2';
    params = [cutoff, limit];
  }
  const result = await pool.query(query, params);
  return result.rows;
}

module.exports = {
  initDb,
  createGoogleUser, getUserByEmail, getUserByGoogleId, getUserById,
  updateRating, recordGamePlayed, getDailyStats, getWeeklyStats, getPlayStreak,
  getUserBadges, awardBadge, getAllUsers, updateAvatar, updateUsername,
  getLeaderboardAllTime, getLeaderboardByPeriod,
  insertGameLog, getGameLogs,
  saveGameState, loadAllGameStates, deleteGameState
};
