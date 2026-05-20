import { useState, useEffect, useRef, useCallback } from 'react';

const MEDAL_ICONS = ['', '\u{1F451}', '\u{1F948}', '\u{1F949}']; // crown, silver, bronze
const PODIUM_CLASSES = ['', 'podium-gold', 'podium-silver', 'podium-bronze'];

const CONFETTI_COLORS = [
  '#d4af37', '#f5d76e', '#ffe088', '#c9a84c',
  '#fff8dc', '#a78bfa', '#5b9bd5', '#f0e68c',
];

function createConfettiPieces(count = 80) {
  const pieces = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 720,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  return pieces;
}

function createSparkles(count = 30) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 3,
  }));
}

export default function VictoryScreen({ gameState, userId, isSpectating, onLeave }) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [sparkles] = useState(() => createSparkles());
  const confettiTimer = useRef(null);

  useEffect(() => {
    // Entrance animation trigger
    requestAnimationFrame(() => setVisible(true));
    // Initial confetti burst
    setConfetti(createConfettiPieces(100));
    // Periodic confetti
    confettiTimer.current = setInterval(() => {
      setConfetti(createConfettiPieces(40));
    }, 6000);
    return () => clearInterval(confettiTimer.current);
  }, []);

  if (!gameState || gameState.phase !== 'ended') return null;

  // Rank players by points (tiebreak: fewer cards = better)
  const ranked = [...gameState.players]
    .filter(p => !p.resigned)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.cards.length - b.cards.length;
    });

  // Add resigned players at the end
  const resigned = gameState.players.filter(p => p.resigned);
  const allRanked = [...ranked, ...resigned];

  const winner = ranked[0];
  const iWon = !isSpectating && winner?.id === userId;
  const ratingChanges = gameState.ratingChanges || {};

  // Podium order for display: [2nd, 1st, 3rd] (center elevated)
  const podiumOrder = [];
  if (ranked.length >= 2) podiumOrder.push({ player: ranked[1], rank: 2 });
  if (ranked.length >= 1) podiumOrder.push({ player: ranked[0], rank: 1 });
  if (ranked.length >= 3) podiumOrder.push({ player: ranked[2], rank: 3 });

  // 4th place shown below if exists
  const fourthPlace = ranked.length >= 4 ? ranked[3] : null;

  function getRatingBadge(playerId) {
    const rc = ratingChanges[playerId];
    if (!rc) return null;
    return rc;
  }

  function getAvatarContent(player) {
    if (player.isCPU) {
      return <span className="victory-avatar-icon">&#x1F916;</span>;
    }
    if (player.avatar) {
      return <span className="victory-avatar-icon">{player.avatar}</span>;
    }
    return <span className="victory-avatar-icon">{player.name.charAt(0).toUpperCase()}</span>;
  }

  return (
    <div className={`victory-overlay ${visible ? 'victory-visible' : ''}`}>
      {/* Sparkle particles */}
      <div className="victory-sparkles">
        {sparkles.map(s => (
          <div
            key={s.id}
            className="victory-sparkle"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Confetti */}
      <div className="victory-confetti-container">
        {confetti.map(c => (
          <div
            key={c.id}
            className={`victory-confetti ${c.shape === 'circle' ? 'confetti-round' : ''}`}
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              '--confetti-color': c.color,
              '--confetti-size': `${c.size}px`,
              '--confetti-drift': `${c.drift}px`,
              '--confetti-rot': `${c.rotation}deg`,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div className={`victory-title-section ${visible ? 'victory-title-enter' : ''}`}>
        {iWon && <div className="victory-crown-icon">&#x1F451;</div>}
        <h1 className="victory-title-text">
          {iWon ? 'VICTORY!' : 'GAME OVER'}
        </h1>
        <p className="victory-subtitle">
          {winner?.name} wins with {winner?.points} points!
        </p>
      </div>

      {/* Podium */}
      <div className="victory-podium">
        {podiumOrder.map(({ player, rank }, i) => {
          const isMe = player.id === userId;
          const rc = getRatingBadge(player.id);
          const isWinner = rank === 1;

          return (
            <div
              key={player.id}
              className={`victory-podium-card ${PODIUM_CLASSES[rank]} ${isWinner ? 'podium-winner' : ''} ${isMe ? 'podium-me' : ''}`}
              style={{ animationDelay: `${0.3 + i * 0.15}s` }}
            >
              {isWinner && <div className="podium-champion-badge">CHAMPION</div>}

              <div className={`podium-rank-badge rank-${rank}`}>
                {rank === 1 ? '\u{1F451}' : rank === 2 ? 'II' : 'III'}
              </div>

              <div className="podium-avatar">
                {getAvatarContent(player)}
                {isWinner && <div className="podium-avatar-glow" />}
              </div>

              <h3 className="podium-name">
                {player.name}
                {isMe && <span className="podium-you-badge">YOU</span>}
              </h3>

              <div className="podium-points">{player.points}</div>
              <div className="podium-points-label">POINTS</div>

              {rc && (
                <div className={`podium-elo ${rc.change.startsWith('+') ? 'elo-positive' : 'elo-negative'}`}>
                  {rc.change} ELO
                </div>
              )}

              <div className="podium-stats-row">
                <div className="podium-stat">
                  <span className="podium-stat-value">{player.cards?.length || 0}</span>
                  <span className="podium-stat-label">Cards</span>
                </div>
                <div className="podium-stat">
                  <span className="podium-stat-value">{player.bonusTiles?.length || 0}</span>
                  <span className="podium-stat-label">Tiles</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4th place (if applicable) */}
      {fourthPlace && (
        <div className="victory-fourth">
          <div className="victory-fourth-card">
            <span className="fourth-rank">4th</span>
            <span className="fourth-avatar">{getAvatarContent(fourthPlace)}</span>
            <span className="fourth-name">{fourthPlace.name}</span>
            <span className="fourth-points">{fourthPlace.points} pts</span>
            {getRatingBadge(fourthPlace.id) && (
              <span className={`fourth-elo ${getRatingBadge(fourthPlace.id).change.startsWith('+') ? 'elo-positive' : 'elo-negative'}`}>
                {getRatingBadge(fourthPlace.id).change}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resigned players */}
      {resigned.length > 0 && (
        <div className="victory-resigned">
          {resigned.map(p => (
            <span key={p.id} className="resigned-player">{p.name} (resigned)</span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="victory-actions">
        <button className="victory-btn-primary" onClick={onLeave}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
