import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Profile({ onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!profile) return <div className="loading">Could not load profile</div>;

  const { user, badges, daily, weekly } = profile;
  const winRate = user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0;

  return (
    <div className="profile-page">
      <button className="btn-link profile-back" onClick={onBack}>← Back to Lobby</button>

      {/* Player card */}
      <div className="profile-card">
        <div className="profile-avatar">
          {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatar-placeholder">👤</span>}
        </div>
        <div className="profile-info">
          <h2>{user.username}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
        <div className="profile-rating">
          <span className="rating-number">{user.rating}</span>
          <span className="rating-label">Rating</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-value">{user.total_games}</span>
          <span className="stat-label">Games Played</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{user.wins}</span>
          <span className="stat-label">Wins</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{winRate}%</span>
          <span className="stat-label">Win Rate</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{user.current_streak}</span>
          <span className="stat-label">Current Streak</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{user.best_streak}</span>
          <span className="stat-label">Best Streak</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{badges.length}</span>
          <span className="stat-label">Badges</span>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="challenges-section">
        <h3>Daily Challenges</h3>
        <div className="challenges-list">
          {daily.map(c => (
            <div key={c.id} className={`challenge-item ${c.done ? 'challenge-done' : ''}`}>
              <span className="challenge-icon">{c.icon}</span>
              <div className="challenge-info">
                <span className="challenge-name">{c.name}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}></div>
                </div>
                <span className="challenge-progress">{Math.min(c.progress, c.target)}/{c.target}</span>
              </div>
              {c.done && <span className="challenge-check">✅</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Challenges */}
      <div className="challenges-section">
        <h3>Weekly Challenges</h3>
        <div className="challenges-list">
          {weekly.map(c => (
            <div key={c.id} className={`challenge-item ${c.done ? 'challenge-done' : ''}`}>
              <span className="challenge-icon">{c.icon}</span>
              <div className="challenge-info">
                <span className="challenge-name">{c.name}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}></div>
                </div>
                <span className="challenge-progress">{Math.min(c.progress, c.target)}/{c.target}</span>
              </div>
              {c.done && <span className="challenge-check">✅</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="badges-section">
        <h3>Badges Earned ({badges.length})</h3>
        {badges.length === 0 ? (
          <p className="no-badges">Play games to earn badges!</p>
        ) : (
          <div className="badges-grid">
            {badges.map(b => (
              <div key={b.badge_key} className="badge-card">
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                <span className="badge-desc">{b.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
