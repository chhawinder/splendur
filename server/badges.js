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
  login_7_days:    { name: 'Weekly Ritual',      icon: '🗓️',  desc: 'Play 7 days in a row',              category: 'loyalty' },
  login_14_days:   { name: 'Addicted',           icon: '🧲',  desc: 'Play 14 days in a row',             category: 'loyalty' },
  login_30_days:   { name: 'Splendur Veteran',   icon: '🎖️',  desc: 'Play 30 days in a row',             category: 'loyalty' },
};

function checkAndAwardBadges(userId) {
  const user = getUserById(userId);
  if (!user) return [];

  const today = new Date().toISOString().split('T')[0];
  const daily = getDailyStats(userId, today);
  const weekly = getWeeklyStats(userId);
  const playStreak = getPlayStreak(userId);
  const existingBadges = new Set(getUserBadges(userId).map(b => b.badge_key));

  const newBadges = [];

  function tryAward(key) {
    if (!existingBadges.has(key)) {
      if (awardBadge(userId, key)) {
        newBadges.push({ key, ...BADGE_DEFS[key] });
      }
    }
  }

  // Milestone checks
  if (user.wins >= 1)   tryAward('first_win');
  if (user.wins >= 5)   tryAward('wins_5');
  if (user.wins >= 10)  tryAward('wins_10');
  if (user.wins >= 25)  tryAward('wins_25');
  if (user.wins >= 50)  tryAward('wins_50');
  if (user.wins >= 100) tryAward('wins_100');
  if (user.total_games >= 10)  tryAward('games_10');
  if (user.total_games >= 50)  tryAward('games_50');
  if (user.total_games >= 100) tryAward('games_100');

  // Rating checks
  if (user.rating >= 1600) tryAward('rating_1600');
  if (user.rating >= 1800) tryAward('rating_1800');
  if (user.rating >= 2000) tryAward('rating_2000');

  // Streak checks
  if (user.current_streak >= 3)  tryAward('streak_3');
  if (user.current_streak >= 5)  tryAward('streak_5');
  if (user.current_streak >= 10) tryAward('streak_10');

  // Daily challenges
  if (daily.games_played >= 3) tryAward('daily_3_games');
  if (daily.games_played >= 5) tryAward('daily_5_games');
  if (daily.games_won >= 3)    tryAward('daily_3_wins');
  if (daily.games_played >= 3 && daily.games_won === daily.games_played) tryAward('daily_perfect');

  // Weekly challenges
  if (weekly.games_played >= 10) tryAward('weekly_10_games');
  if (weekly.games_played >= 15) tryAward('weekly_15_games');
  if (weekly.games_won >= 7)     tryAward('weekly_7_wins');

  // Play streak (consecutive days)
  if (playStreak >= 3)  tryAward('login_3_days');
  if (playStreak >= 7)  tryAward('login_7_days');
  if (playStreak >= 14) tryAward('login_14_days');
  if (playStreak >= 30) tryAward('login_30_days');

  return newBadges;
}

function getPlayerBadgesWithDefs(userId) {
  const badges = getUserBadges(userId);
  return badges.map(b => ({
    ...b,
    ...BADGE_DEFS[b.badge_key],
  }));
}

function getDailyChallenges(userId) {
  const today = new Date().toISOString().split('T')[0];
  const daily = getDailyStats(userId, today);
  const existingBadges = new Set(getUserBadges(userId).map(b => b.badge_key));

  return [
    { id: 'daily_3_games', name: 'Play 3 games today', icon: '📅', progress: daily.games_played, target: 3, done: existingBadges.has('daily_3_games') || daily.games_played >= 3 },
    { id: 'daily_5_games', name: 'Play 5 games today', icon: '🏃', progress: daily.games_played, target: 5, done: existingBadges.has('daily_5_games') || daily.games_played >= 5 },
    { id: 'daily_3_wins', name: 'Win 3 games today', icon: '🌅', progress: daily.games_won, target: 3, done: existingBadges.has('daily_3_wins') || daily.games_won >= 3 },
  ];
}

function getWeeklyChallenges(userId) {
  const weekly = getWeeklyStats(userId);
  const existingBadges = new Set(getUserBadges(userId).map(b => b.badge_key));

  return [
    { id: 'weekly_10_games', name: 'Play 10 games this week', icon: '📆', progress: weekly.games_played, target: 10, done: existingBadges.has('weekly_10_games') || weekly.games_played >= 10 },
    { id: 'weekly_7_wins', name: 'Win 7 games this week', icon: '💪', progress: weekly.games_won, target: 7, done: existingBadges.has('weekly_7_wins') || weekly.games_won >= 7 },
  ];
}

module.exports = { BADGE_DEFS, checkAndAwardBadges, getPlayerBadgesWithDefs, getDailyChallenges, getWeeklyChallenges };
