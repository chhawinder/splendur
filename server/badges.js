const { getUserById, getDailyStats, getWeeklyStats, getPlayStreak, getUserBadges, awardBadge } = require('./db');

// Badge definitions with conditions
const BADGE_DEFS = {
  // === MILESTONE BADGES ===
  first_win:       { name: 'First Blood',       icon: '🗡️',  desc: 'Win your first game',               category: 'milestone' },
  wins_5:          { name: 'Getting Warmed Up',  icon: '🔥',  desc: 'Win 5 games',                       category: 'milestone' },
  wins_10:         { name: 'Seasoned Player',    icon: '⚔️',  desc: 'Win 10 games',                      category: 'milestone' },
  wins_25:         { name: 'Gem Master',         icon: '💎',  desc: 'Win 25 games',                      category: 'milestone' },
  wins_50:         { name: 'Legendary',          icon: '👑',  desc: 'Win 50 games',                      category: 'milestone' },
  wins_100:        { name: 'Unstoppable',        icon: '🏆',  desc: 'Win 100 games',                     category: 'milestone' },
  games_10:        { name: 'Regular',            icon: '🎮',  desc: 'Play 10 games',                     category: 'milestone' },
  games_50:        { name: 'Dedicated',          icon: '🎯',  desc: 'Play 50 games',                     category: 'milestone' },
  games_100:       { name: 'Centurion',          icon: '💯',  desc: 'Play 100 games',                    category: 'milestone' },

  // === RATING BADGES ===
  rating_1600:     { name: 'Rising Star',        icon: '⭐',  desc: 'Reach 1600 rating',                 category: 'rating' },
  rating_1800:     { name: 'Expert',             icon: '🌟',  desc: 'Reach 1800 rating',                 category: 'rating' },
  rating_2000:     { name: 'Grandmaster',        icon: '✨',  desc: 'Reach 2000 rating',                 category: 'rating' },

  // === STREAK BADGES ===
  streak_3:        { name: 'Hat Trick',          icon: '🎩',  desc: 'Win 3 games in a row',              category: 'streak' },
  streak_5:        { name: 'On Fire',            icon: '🔥',  desc: 'Win 5 games in a row',              category: 'streak' },
  streak_10:       { name: 'Untouchable',        icon: '💫',  desc: 'Win 10 games in a row',             category: 'streak' },

  // === DAILY CHALLENGE BADGES ===
  daily_3_games:   { name: 'Daily Player',       icon: '📅',  desc: 'Play 3 games in one day',           category: 'daily' },
  daily_5_games:   { name: 'Marathon Runner',    icon: '🏃',  desc: 'Play 5 games in one day',           category: 'daily' },
  daily_3_wins:    { name: 'Daily Dominator',    icon: '🌅',  desc: 'Win 3 games in one day',            category: 'daily' },
  daily_perfect:   { name: 'Perfect Day',        icon: '☀️',  desc: 'Win all games in a day (min 3)',    category: 'daily' },

  // === WEEKLY CHALLENGE BADGES ===
  weekly_10_games: { name: 'Weekly Warrior',     icon: '📆',  desc: 'Play 10 games in a week',           category: 'weekly' },
  weekly_15_games: { name: 'No Life',            icon: '🤓',  desc: 'Play 15 games in a week',           category: 'weekly' },
  weekly_7_wins:   { name: 'Week Crusher',       icon: '💪',  desc: 'Win 7 games in a week',             category: 'weekly' },

  // === PLAY STREAK (consecutive days) ===
  login_3_days:    { name: 'Consistent',         icon: '📌',  desc: 'Play 3 days in a row',              category: 'loyalty' },
  login_7_days:    { name: 'Weekly Ritual',       icon: '🗓️',  desc: 'Play 7 days in a row',              category: 'loyalty' },
  login_14_days:   { name: 'Addicted',           icon: '🧲',  desc: 'Play 14 days in a row',             category: 'loyalty' },
  login_30_days:   { name: 'Splendur Veteran',   icon: '🎖️',  desc: 'Play 30 days in a row',             category: 'loyalty' },

  // === CPU BADGES ===
  cpu_1:           { name: 'Bot Basher',         icon: '🤖',  desc: 'Play a game against CPU',           category: 'cpu' },
  cpu_5:           { name: 'Bot Bully',          icon: '🦾',  desc: 'Play 5 games against CPU',          category: 'cpu' },
  cpu_10:          { name: 'Machine Slayer',     icon: '⚙️',  desc: 'Play 10 games against CPU',         category: 'cpu' },
  cpu_25:          { name: 'AI Overlord',        icon: '🧠',  desc: 'Play 25 games against CPU',         category: 'cpu' },
};

async function checkAndAwardBadges(userId) {
  const user = await getUserById(userId);
  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];
  const daily = await getDailyStats(userId, today);
  const weekly = await getWeeklyStats(userId);
  const playStreak = await getPlayStreak(userId);
  const existingBadges = new Set((await getUserBadges(userId)).map(b => b.badge_key));

  const newBadges = [];

  async function tryAward(key) {
    if (!existingBadges.has(key)) {
      if (await awardBadge(userId, key)) {
        newBadges.push({ key, ...BADGE_DEFS[key] });
      }
    }
  }

  // Milestone checks
  if (user.wins >= 1)   await tryAward('first_win');
  if (user.wins >= 5)   await tryAward('wins_5');
  if (user.wins >= 10)  await tryAward('wins_10');
  if (user.wins >= 25)  await tryAward('wins_25');
  if (user.wins >= 50)  await tryAward('wins_50');
  if (user.wins >= 100) await tryAward('wins_100');
  if (user.total_games >= 10)  await tryAward('games_10');
  if (user.total_games >= 50)  await tryAward('games_50');
  if (user.total_games >= 100) await tryAward('games_100');

  // Rating checks
  if (user.rating >= 1600) await tryAward('rating_1600');
  if (user.rating >= 1800) await tryAward('rating_1800');
  if (user.rating >= 2000) await tryAward('rating_2000');

  // Streak checks
  if (user.current_streak >= 3)  await tryAward('streak_3');
  if (user.current_streak >= 5)  await tryAward('streak_5');
  if (user.current_streak >= 10) await tryAward('streak_10');

  // Daily challenges
  if (daily.games_played >= 3) await tryAward('daily_3_games');
  if (daily.games_played >= 5) await tryAward('daily_5_games');
  if (daily.games_won >= 3)    await tryAward('daily_3_wins');
  if (daily.games_played >= 3 && daily.games_won === daily.games_played) await tryAward('daily_perfect');

  // Weekly challenges
  if (weekly.games_played >= 10) await tryAward('weekly_10_games');
  if (weekly.games_played >= 15) await tryAward('weekly_15_games');
  if (weekly.games_won >= 7)     await tryAward('weekly_7_wins');

  // Play streak (consecutive days)
  if (playStreak >= 3)  await tryAward('login_3_days');
  if (playStreak >= 7)  await tryAward('login_7_days');
  if (playStreak >= 14) await tryAward('login_14_days');
  if (playStreak >= 30) await tryAward('login_30_days');

  // CPU badges
  const cpuGames = user.cpu_games || 0;
  if (cpuGames >= 1)  await tryAward('cpu_1');
  if (cpuGames >= 5)  await tryAward('cpu_5');
  if (cpuGames >= 10) await tryAward('cpu_10');
  if (cpuGames >= 25) await tryAward('cpu_25');

  return newBadges;
}

async function getPlayerBadgesWithDefs(userId) {
  const badges = await getUserBadges(userId);
  return badges.map(b => ({
    ...b,
    ...BADGE_DEFS[b.badge_key],
  }));
}

async function getDailyChallenges(userId) {
  const today = new Date().toISOString().split('T')[0];
  const daily = await getDailyStats(userId, today);
  const existingBadges = new Set((await getUserBadges(userId)).map(b => b.badge_key));

  return [
    { id: 'daily_3_games', name: 'Play 3 games today', icon: '📅', progress: daily.games_played, target: 3, done: existingBadges.has('daily_3_games') || daily.games_played >= 3 },
    { id: 'daily_5_games', name: 'Play 5 games today', icon: '🏃', progress: daily.games_played, target: 5, done: existingBadges.has('daily_5_games') || daily.games_played >= 5 },
    { id: 'daily_3_wins', name: 'Win 3 games today', icon: '🌅', progress: daily.games_won, target: 3, done: existingBadges.has('daily_3_wins') || daily.games_won >= 3 },
  ];
}

async function getWeeklyChallenges(userId) {
  const weekly = await getWeeklyStats(userId);
  const existingBadges = new Set((await getUserBadges(userId)).map(b => b.badge_key));

  return [
    { id: 'weekly_10_games', name: 'Play 10 games this week', icon: '📆', progress: weekly.games_played, target: 10, done: existingBadges.has('weekly_10_games') || weekly.games_played >= 10 },
    { id: 'weekly_7_wins', name: 'Win 7 games this week', icon: '💪', progress: weekly.games_won, target: 7, done: existingBadges.has('weekly_7_wins') || weekly.games_won >= 7 },
  ];
}

// Check which daily/weekly challenges were just completed (progress crossed target)
async function getNewlyCompletedChallenges(userId, prevDaily, prevWeekly) {
  const today = new Date().toISOString().split('T')[0];
  const daily = await getDailyStats(userId, today);
  const weekly = await getWeeklyStats(userId);
  const completed = [];

  // Daily challenges
  if (daily.games_played >= 3 && prevDaily.games_played < 3)
    completed.push({ name: 'Play 3 games today', icon: '📅' });
  if (daily.games_played >= 5 && prevDaily.games_played < 5)
    completed.push({ name: 'Play 5 games today', icon: '🏃' });
  if (daily.games_won >= 3 && prevDaily.games_won < 3)
    completed.push({ name: 'Win 3 games today', icon: '🌅' });

  // Weekly challenges
  if (weekly.games_played >= 10 && prevWeekly.games_played < 10)
    completed.push({ name: 'Play 10 games this week', icon: '📆' });
  if (weekly.games_won >= 7 && prevWeekly.games_won < 7)
    completed.push({ name: 'Win 7 games this week', icon: '💪' });

  return completed;
}

module.exports = { BADGE_DEFS, checkAndAwardBadges, getPlayerBadgesWithDefs, getDailyChallenges, getWeeklyChallenges, getNewlyCompletedChallenges };
