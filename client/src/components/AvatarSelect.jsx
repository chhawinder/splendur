import { useState } from 'react';
import { useTheme } from '../ThemeContext';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Sprite sheet: 4 cols x 3 rows, 1024x1024 image
// Each cell: 256x341 (approx)
const AVATARS = [
  { id: 'merchant',  emoji: '🧔',    label: 'The Merchant',  col: 0, row: 0 },
  { id: 'duchess',   emoji: '👸',    label: 'The Duchess',   col: 1, row: 0 },
  { id: 'alchemist', emoji: '🧙',    label: 'The Alchemist', col: 2, row: 0 },
  { id: 'knight',    emoji: '🤴',    label: 'The Knight',    col: 3, row: 0 },
  { id: 'pirate',    emoji: '🏴‍☠️', label: 'The Pirate',    col: 0, row: 1 },
  { id: 'queen',     emoji: '👑',    label: 'The Queen',     col: 1, row: 1 },
  { id: 'jester',    emoji: '🃏',    label: 'The Jester',    col: 2, row: 1 },
  { id: 'dragon',    emoji: '🐉',    label: 'The Dragon',    col: 3, row: 1 },
  { id: 'phoenix',   emoji: '🦅',    label: 'The Phoenix',   col: 0, row: 2 },
  { id: 'fox',       emoji: '🦊',    label: 'The Fox',       col: 1, row: 2 },
  { id: 'wolf',      emoji: '🐺',    label: 'The Wolf',      col: 2, row: 2 },
  { id: 'gem',       emoji: '💎',    label: 'The Gem',       col: 3, row: 2 },
];

// Get sprite background style for an avatar
function getAvatarSpriteStyle(avatar, size = 64) {
  if (!avatar) return {};
  const a = AVATARS.find(av => av.id === avatar);
  if (!a) return {};
  return {
    backgroundImage: 'url(/avatars/sprites.png)',
    backgroundSize: '400% 300%',
    backgroundPosition: `${(a.col / 3) * 100}% ${(a.row / 2) * 100}%`,
    width: size, height: size,
    borderRadius: '50%',
  };
}

export default function AvatarSelect({ user, onSelect }) {
  const [selected, setSelected] = useState(null);
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const useSpriteAvatars = true; // All themes use sprite avatars

  async function handleConfirm() {
    if (!selected || saving) return;
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      setError('Name must be 2-20 characters');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');

      // Save avatar
      const avatarRes = await fetch(`${API}/api/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: selected }),
      });
      if (!avatarRes.ok) {
        setError('Failed to save avatar');
        setSaving(false);
        return;
      }
      let latestUser = (await avatarRes.json()).user;

      // Save name if changed
      if (trimmedName !== user?.username) {
        const nameRes = await fetch(`${API}/api/username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ username: trimmedName }),
        });
        if (nameRes.ok) {
          latestUser = (await nameRes.json()).user;
        } else {
          const data = await nameRes.json();
          setError(data.error || 'Failed to save name');
          setSaving(false);
          return;
        }
      }

      onSelect(latestUser);
    } catch {
      setError('Something went wrong');
    }
    setSaving(false);
  }

  return (
    <div className="avatar-select-page">
      <div className="avatar-select-card">
        <h2>Welcome to Splendur</h2>
        <p className="avatar-subtitle">Choose your display name and avatar</p>

        <div className="avatar-name-field">
          <label className="avatar-name-label">Display Name</label>
          <input
            type="text"
            className="avatar-name-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        {error && <p className="avatar-error">{error}</p>}

        <div className={`avatar-grid ${useSpriteAvatars ? 'avatar-grid-sprites' : ''}`}>
          {AVATARS.map(a => (
            <button
              key={a.id}
              className={`avatar-option ${selected === a.id ? 'avatar-selected' : ''}`}
              onClick={() => setSelected(a.id)}
            >
              {useSpriteAvatars ? (
                <div className="avatar-sprite" style={getAvatarSpriteStyle(a.id, 80)} />
              ) : (
                <span className="avatar-emoji">{a.emoji}</span>
              )}
              <span className="avatar-label">{a.label}</span>
            </button>
          ))}
        </div>
        {selected && (
          <button className="btn-primary avatar-confirm" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        )}
      </div>
    </div>
  );
}

export { AVATARS, getAvatarSpriteStyle };
