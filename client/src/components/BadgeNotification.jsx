import { useState, useMemo } from 'react';

const CONFETTI_COLORS = ['#d4af37', '#e8c46c', '#a78bfa', '#f87171', '#34d399', '#60a5fa', '#fbbf24', '#f472b6'];

function makeConfetti() {
  const pieces = [];
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.6;
    const dist = 100 + Math.random() * 200;
    pieces.push({
      id: i,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 80}px`,
      rot: `${360 + Math.random() * 720}deg`,
      size: `${5 + Math.random() * 8}px`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: `${Math.random() * 200}ms`,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    });
  }
  return pieces;
}

export default function BadgeNotification({ badges, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const confetti = useMemo(() => makeConfetti(), [currentIndex]);

  if (!badges || badges.length === 0) return null;
  const badge = badges[currentIndex];

  function handleAccept() {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onDone();
    }
  }

  return (
    <div className="badge-celebration-overlay">
      {/* Confetti burst */}
      <div className="badge-confetti-container">
        {confetti.map(p => (
          <div
            key={p.id}
            className={`badge-confetti-piece ${p.shape === 'circle' ? 'badge-confetti-circle' : ''}`}
            style={{
              '--dx': p.dx,
              '--dy': p.dy,
              '--rot': p.rot,
              width: p.size,
              height: p.shape === 'rect' ? `calc(${p.size} * 0.5)` : p.size,
              background: p.color,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Badge/Challenge card */}
      <div className="badge-celebration-card">
        <div className="badge-celebration-glow" />
        <div className="badge-celebration-label">
          {badge.isChallenge ? 'Challenge Complete!' : 'Badge Unlocked!'}
        </div>
        <div className="badge-celebration-icon">{badge.icon}</div>
        <div className="badge-celebration-name">{badge.name}</div>
        {badge.desc && <div className="badge-celebration-desc">{badge.desc}</div>}

        {badges.length > 1 && (
          <div className="badge-celebration-counter">{currentIndex + 1} / {badges.length}</div>
        )}

        <button className="badge-celebration-accept" onClick={handleAccept}>
          {currentIndex < badges.length - 1 ? 'Next' : 'Accept'}
        </button>
      </div>
    </div>
  );
}
