import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const CATEGORIES = ['all', 'milestones', 'rating', 'streaks', 'daily', 'weekly', 'loyalty', 'cpu'];
const CATEGORY_LABELS = {
  all: 'All',
  milestones: 'Milestones',
  rating: 'Rating',
  streaks: 'Streaks',
  daily: 'Daily',
  weekly: 'Weekly',
  loyalty: 'Loyalty',
  cpu: 'CPU',
};

export default function Achievements({ user }) {
  const [filter, setFilter] = useState('all');
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/api/achievements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBadges(data.badges || []);
          setStats(data.stats || null);
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  const filtered = filter === 'all'
    ? badges
    : badges.filter(b => b.category === filter);

  const totalUnlocked = badges.filter(b => b.earned).length;
  const unlockPercent = badges.length > 0 ? Math.round((totalUnlocked / badges.length) * 100) : 0;

  if (loading) {
    return (
      <div className="ach-page">
        <h1 className="ach-title">ACHIEVEMENTS</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="ach-page">
      <h1 className="ach-title">ACHIEVEMENTS</h1>

      <div className="ach-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`ach-filter-btn ${filter === cat ? 'ach-filter-active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="ach-grid">
        {filtered.map(badge => {
          const unlocked = badge.earned;
          const locked = !unlocked && badge.progress === 0;
          const progressPct = badge.target > 0
            ? Math.min(100, Math.round((badge.progress / badge.target) * 100))
            : 0;

          return (
            <div
              key={badge.key}
              className={`ach-card ${unlocked ? 'ach-card-unlocked' : ''} ${locked ? 'ach-card-locked' : ''}`}
            >
              {locked && <div className="ach-card-lock-overlay">🔒</div>}

              <div className={`ach-card-icon ${unlocked ? 'ach-card-icon-gold' : ''}`}>
                {badge.icon}
              </div>

              <span className="ach-card-category">{CATEGORY_LABELS[badge.category] || badge.category}</span>
              <h3 className="ach-card-name">{badge.name}</h3>
              <p className="ach-card-desc">{badge.desc}</p>

              <div className="ach-progress">
                <div className="ach-progress-bar">
                  <div
                    className="ach-progress-fill"
                    style={{ width: `${unlocked ? 100 : progressPct}%` }}
                  />
                </div>
                <span>
                  {unlocked
                    ? `${badge.target} / ${badge.target}`
                    : `${badge.progress} / ${badge.target}`}
                </span>
              </div>

              {unlocked && badge.earned_at && (
                <div className="ach-card-unlocked-date">
                  UNLOCKED {new Date(badge.earned_at).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 32 }}>
          No achievements in this category yet.
        </p>
      )}

      {stats && (
        <div className="ach-stats">
          <div className="ach-stat">
            <div className="ach-stat-value">{unlockPercent}%</div>
            <div className="ach-stat-label">Unlocked</div>
          </div>
          <div className="ach-stat">
            <div className="ach-stat-value">{totalUnlocked}</div>
            <div className="ach-stat-label">Total Badges</div>
          </div>
          <div className="ach-stat">
            <div className="ach-stat-value">{stats.total_games ?? 0}</div>
            <div className="ach-stat-label">Total Games</div>
          </div>
          <div className="ach-stat">
            <div className="ach-stat-value">{stats.wins ?? 0}</div>
            <div className="ach-stat-label">Wins</div>
          </div>
          <div className="ach-stat">
            <div className="ach-stat-value">{stats.rating ?? 1500}</div>
            <div className="ach-stat-label">Rating</div>
          </div>
        </div>
      )}
    </div>
  );
}
