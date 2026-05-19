import { useState, useEffect } from 'react';
import { AVATARS, getAvatarSpriteStyle } from './AvatarSelect';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const PERIODS = [
  { key: 'alltime', label: 'ALL TIME' },
  { key: 'week', label: 'THIS WEEK' },
  { key: 'month', label: 'THIS MONTH' },
];

const MEDAL_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export default function Leaderboard({ user }) {
  const [period, setPeriod] = useState('alltime');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/leaderboard?period=${period}`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data.players || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const myRank = user ? players.findIndex(p => p.id === user.id) + 1 : 0;
  const myPlayer = myRank > 0 ? players[myRank - 1] : null;

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  // Podium visual order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumClasses = ['lb-podium-second', 'lb-podium-first', 'lb-podium-third'];

  return (
    <div className="lb-page">
      <h1 className="lb-title">LEADERBOARD</h1>

      <div className="lb-filters">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`lb-filter-btn ${period === p.key ? 'lb-filter-active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No players yet. Be the first!</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="lb-podium">
              {podiumOrder.map((player, i) => {
                if (!player) return null;
                const rank = players.indexOf(player) + 1;
                return (
                  <div key={player.id || i} className={`lb-podium-item ${podiumClasses[i]}`}>
                    <div className="lb-rank-badge" style={{ backgroundColor: MEDAL_COLORS[rank], color: '#1a1a1a' }}>
                      {rank}
                    </div>
                    <div
                      className="lb-podium-avatar"
                      style={{
                        ...getAvatarSpriteStyle(player.avatar, 80),
                        border: `3px solid ${MEDAL_COLORS[rank]}`,
                      }}
                    />
                    <div className="lb-podium-name">{player.username}</div>
                    <div className="lb-podium-elo">{player.rating || 1500} ELO</div>
                    <div className="lb-podium-record">{player.wins || 0}W / {player.losses || 0}L</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table header */}
          <div className="lb-list-header">
            <span className="lb-col-rank">RANK</span>
            <span className="lb-col-player">PLAYER</span>
            <span className="lb-col-elo">ELO</span>
            <span className="lb-col-wl">W / L</span>
            <span className="lb-col-streak">STREAK</span>
          </div>

          <div className="lb-list">
            {rest.map((player, i) => {
              const rank = i + 4;
              const isMe = user && player.id === user.id;
              return (
                <div key={player.id || i} className={`lb-row ${isMe ? 'lb-my-rank' : ''}`}>
                  <span className="lb-row-rank">{rank}</span>
                  <div className="lb-row-player">
                    <div className="lb-row-avatar" style={getAvatarSpriteStyle(player.avatar, 36)} />
                    <span className="lb-row-name">{player.username}</span>
                  </div>
                  <span className="lb-row-elo">{player.rating || 1500}</span>
                  <span className="lb-row-wl">{player.wins || 0} / {player.losses || 0}</span>
                  <span className="lb-row-streak">
                    {(player.current_streak || 0) > 0 ? `🔥 ${player.current_streak}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Your rank sticky bar */}
          {myPlayer && myRank > 3 && (
            <div className="lb-my-rank-sticky">
              <span className="lb-sticky-label">YOUR RANK</span>
              <div className="lb-row lb-my-rank">
                <span className="lb-row-rank">{myRank}</span>
                <div className="lb-row-player">
                  <div className="lb-row-avatar" style={getAvatarSpriteStyle(myPlayer.avatar, 36)} />
                  <span className="lb-row-name">{myPlayer.username}</span>
                </div>
                <span className="lb-row-elo">{myPlayer.rating || 1500}</span>
                <span className="lb-row-wl">{myPlayer.wins || 0} / {myPlayer.losses || 0}</span>
                <span className="lb-row-streak">
                  {(myPlayer.current_streak || 0) > 0 ? `🔥 ${myPlayer.current_streak}` : '—'}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
