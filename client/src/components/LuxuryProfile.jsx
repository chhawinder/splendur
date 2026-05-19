import { useState } from 'react';
import { AVATARS, getAvatarSpriteStyle } from './AvatarSelect';
import { useTheme } from '../ThemeContext';

const AVATAR_MAP = Object.fromEntries(AVATARS.map(a => [a.id, a]));

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function getRankInfo(rating) {
  if (rating >= 2000) return { label: 'GRANDMASTER', icon: '✨' };
  if (rating >= 1800) return { label: 'MASTER', icon: '🌟' };
  if (rating >= 1600) return { label: 'EXPERT', icon: '⭐' };
  if (rating >= 1400) return { label: 'RISING STAR', icon: '🔥' };
  return { label: 'NOVICE', icon: '🎮' };
}

export default function LuxuryProfile({ profile, setProfile, onBack, onUserUpdate }) {
  const { user, badges, daily, weekly } = profile;
  const winRate = user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0;
  const rank = getRankInfo(user.rating || 1500);
  const avatarInfo = AVATAR_MAP[user.avatar];
  const { theme, setTheme, themes } = useTheme();

  const [showCustomize, setShowCustomize] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(user.avatar);
  const [pendingName, setPendingName] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openCustomize() {
    setPendingAvatar(user.avatar);
    setPendingName(user.username);
    setError('');
    setShowCustomize(true);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      let latestUser = user;

      // Save avatar if changed
      if (pendingAvatar !== user.avatar) {
        const res = await fetch(`${API}/api/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatar: pendingAvatar }),
        });
        if (res.ok) {
          const data = await res.json();
          latestUser = data.user;
          setProfile(prev => ({ ...prev, user: data.user }));
        }
      }

      // Save username if changed
      if (pendingName.trim() !== user.username) {
        const res = await fetch(`${API}/api/username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ username: pendingName.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          latestUser = data.user;
          setProfile(prev => ({ ...prev, user: data.user }));
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to update name');
          setSaving(false);
          return;
        }
      }

      // Propagate to App-level state
      onUserUpdate?.(latestUser);
      setShowCustomize(false);
    } catch {
      setError('Something went wrong');
    }
    setSaving(false);
  }

  return (
    <div className="luxury-lobby">
      {/* Mobile top bar */}
      <div className="lux-mobile-topbar">
        <button className="lux-mobile-back" onClick={onBack}>&larr; LOBBY</button>
        <span className="lux-mobile-brand">PROFILE</span>
        <span />
      </div>

      {/* Sidebar */}
      <aside className="lux-sidebar">
        <div className="lux-sidebar-brand">SPLENDUR</div>

        <div className="lux-sidebar-profile">
          <div className="luxury-avatar-img lux-sidebar-avatar" style={getAvatarSpriteStyle(user.avatar, 56)} />
          <div>
            <div className="lux-sidebar-name">{avatarInfo?.label || user.username}</div>
            <div className="lux-sidebar-meta">
              <span className="lux-elo-badge">{user.rating || 1500} ELO</span>
            </div>
          </div>
        </div>

        <nav className="lux-sidebar-nav">
          <a className="lux-nav-item" href="#" onClick={e => { e.preventDefault(); onBack(); }}>
            <span className="lux-nav-icon">&#9672;</span> LOBBY
          </a>
          <a className="lux-nav-item active" href="#">
            <span className="lux-nav-icon">&#9733;</span> PROFILE
          </a>
          <a className="lux-nav-item" href="#">
            <span className="lux-nav-icon">&#9814;</span> LEADERBOARD
          </a>
          <a className="lux-nav-item" href="#">
            <span className="lux-nav-icon">&#127942;</span> ACHIEVEMENTS
          </a>
          <a className="lux-nav-item" href="#">
            <span className="lux-nav-icon">&#9432;</span> HOW TO PLAY
          </a>
        </nav>

        {/* Theme switcher */}
        <div className="lux-sidebar-themes">
          <span className="lux-themes-label">THEME</span>
          <div className="lux-themes-row">
            {Object.values(themes).map(t => (
              <button
                key={t.name}
                className={`lux-theme-btn ${theme === t.name ? 'lux-theme-active' : ''}`}
                onClick={() => setTheme(t.name)}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lux-main">
        <div className="lux-profile-layout">
          {/* Left: Character Card */}
          <div className="lux-profile-card-col">
            <div className="lux-profile-hero-card">
              <div className="lux-profile-hero-img">
                <div className="luxury-avatar-img lux-profile-avatar" style={getAvatarSpriteStyle(user.avatar, 200)} />
                <div className="lux-profile-hero-overlay" />
                <div className="lux-profile-hero-bottom">
                  <div>
                    <span className="lux-profile-rank-label">CURRENT RANK</span>
                    <div className="lux-profile-rank-row">
                      <span className="lux-profile-rank-icon">{rank.icon}</span>
                      <span className="lux-profile-rank-text">{rank.label}</span>
                    </div>
                  </div>
                  <div className="lux-profile-elo-block">
                    <span className="lux-profile-rank-label">ELO RATING</span>
                    <span className="lux-profile-elo-value">{user.rating || 1500}</span>
                  </div>
                </div>
              </div>

              <div className="lux-profile-hero-info">
                <h2 className="lux-profile-title">{avatarInfo?.label || 'Unknown'}</h2>
                <p className="lux-profile-subtitle">Master {user.username}</p>

                <div className="lux-profile-meta-grid">
                  <div>
                    <span className="lux-profile-meta-label">TOTAL GAMES</span>
                    <span className="lux-profile-meta-value">{user.total_games}</span>
                  </div>
                  <div>
                    <span className="lux-profile-meta-label">BEST STREAK</span>
                    <span className="lux-profile-meta-value">{user.best_streak}</span>
                  </div>
                </div>

                <button className="lux-btn-gold lux-customize-btn" onClick={openCustomize}>
                  CUSTOMIZE AVATAR
                </button>
              </div>
            </div>
          </div>

          {/* Right: Stats & Challenges */}
          <div className="lux-profile-stats-col">
            {/* Performance Grid */}
            <div className="lux-perf-grid">
              <div className="lux-perf-card">
                <span className="lux-perf-label">WIN RATE</span>
                <span className="lux-perf-value lux-perf-gold">{winRate}%</span>
              </div>
              <div className="lux-perf-card lux-perf-accent">
                <span className="lux-perf-label">CURRENT STREAK</span>
                <div className="lux-perf-row">
                  <span className="lux-perf-value">{user.current_streak} WINS</span>
                  {user.current_streak >= 3 && <span className="lux-perf-fire">🔥</span>}
                </div>
              </div>
              <div className="lux-perf-card">
                <span className="lux-perf-label">GEM HEISTS</span>
                <span className="lux-perf-value">{user.total_games}</span>
              </div>
            </div>

            {/* Daily Challenges */}
            <div className="lux-challenges-panel">
              <h3 className="lux-challenges-title">DAILY CHALLENGES</h3>
              <div className="lux-challenges-list">
                {daily.map(c => (
                  <div key={c.id} className="lux-challenge-row">
                    <div className="lux-challenge-header">
                      <span className="lux-challenge-name">{c.name}</span>
                      <span className="lux-challenge-count">{Math.min(c.progress, c.target)} / {c.target}</span>
                    </div>
                    <div className="lux-challenge-bar">
                      <div
                        className={`lux-challenge-fill ${c.done ? 'lux-challenge-done' : ''}`}
                        style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Challenges */}
            <div className="lux-challenges-panel">
              <h3 className="lux-challenges-title">WEEKLY CHALLENGES</h3>
              <div className="lux-challenges-list">
                {weekly.map(c => (
                  <div key={c.id} className="lux-challenge-row">
                    <div className="lux-challenge-header">
                      <span className="lux-challenge-name">{c.name}</span>
                      <span className="lux-challenge-count">{Math.min(c.progress, c.target)} / {c.target}</span>
                    </div>
                    <div className="lux-challenge-bar">
                      <div
                        className={`lux-challenge-fill ${c.done ? 'lux-challenge-done' : ''}`}
                        style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hall of Fame / Badges */}
            <div className="lux-badges-panel">
              <h3 className="lux-challenges-title">HALL OF FAME</h3>
              {badges.length === 0 ? (
                <p className="lux-no-badges">Play games to earn badges!</p>
              ) : (
                <div className="lux-badges-grid">
                  {badges.map(b => (
                    <div key={b.badge_key} className="lux-badge-card">
                      <div className="lux-badge-icon-wrap">
                        <span className="lux-badge-icon">{b.icon}</span>
                      </div>
                      <span className="lux-badge-name">{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Customize Modal */}
      {showCustomize && (
        <div className="lux-modal-overlay" onClick={() => setShowCustomize(false)}>
          <div className="lux-customize-modal" onClick={e => e.stopPropagation()}>
            <button className="lux-modal-close" onClick={() => setShowCustomize(false)}>&times;</button>
            <h2 className="lux-modal-title">Customize Character</h2>

            {/* Preview */}
            <div className="lux-modal-preview">
              <div className="luxury-avatar-img lux-modal-preview-avatar" style={getAvatarSpriteStyle(pendingAvatar, 100)} />
              <div className="lux-modal-preview-info">
                <span className="lux-modal-preview-character">{AVATAR_MAP[pendingAvatar]?.label || 'Unknown'}</span>
                <span className="lux-modal-preview-name">Master {pendingName}</span>
              </div>
            </div>

            {/* Name input */}
            <div className="lux-modal-field">
              <label className="lux-modal-label">DISPLAY NAME</label>
              <input
                type="text"
                className="lux-modal-input"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                maxLength={20}
                placeholder="Enter your name"
              />
            </div>

            {error && <p className="lux-modal-error">{error}</p>}

            {/* Avatar grid */}
            <div className="lux-modal-field">
              <label className="lux-modal-label">SELECT AVATAR</label>
              <div className="lux-modal-avatar-grid">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    className={`lux-modal-avatar-pick ${pendingAvatar === a.id ? 'lux-modal-avatar-active' : ''}`}
                    onClick={() => setPendingAvatar(a.id)}
                  >
                    <div className="luxury-avatar-img" style={getAvatarSpriteStyle(a.id, 56)} />
                    <span className="lux-modal-avatar-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="lux-modal-actions">
              <button className="lux-btn-danger lux-btn-sm" onClick={() => setShowCustomize(false)}>CANCEL</button>
              <button className="lux-btn-gold lux-btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
