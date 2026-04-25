const COLOR_MAP = {
  black: '#2d2d2d',
  white: '#f5f5f0',
  blue: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
};

const COLOR_EMOJI = {
  black: '⚫',
  white: '⚪',
  blue: '🔵',
  green: '🟢',
  red: '🔴',
};

const COLOR_GRADIENT = {
  black: 'linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%)',
  white: 'linear-gradient(145deg, #ffffff 0%, #e8e8e0 100%)',
  blue: 'linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%)',
  green: 'linear-gradient(145deg, #22c55e 0%, #15803d 100%)',
  red: 'linear-gradient(145deg, #ef4444 0%, #b91c1c 100%)',
};

// Lighter body backgrounds so cards stand out from the dark game board
const CARD_BODY_BG = {
  black: '#3d3d4a',
  white: '#d0cfc8',
  blue: '#c7d8f5',
  green: '#c5e8d4',
  red: '#f5caca',
};

const GEM_ICONS = {
  black: '◆',
  white: '◇',
  blue: '💧',
  green: '🌿',
  red: '♥',
};

export default function Card({ card, onClick, small }) {
  if (!card || card.hidden) {
    return (
      <div className={`card card-hidden ${small ? 'card-small' : ''}`} onClick={onClick}>
        <div className="card-hidden-inner">
          <span className="card-hidden-gem">💎</span>
        </div>
      </div>
    );
  }

  const costs = Object.entries(card.cost || {}).filter(([, v]) => v > 0);
  const isWhite = card.discount === 'white';

  return (
    <div
      className={`card ${small ? 'card-small' : ''}`}
      style={{
        background: CARD_BODY_BG[card.discount],
        borderColor: isWhite ? '#aaa' : undefined,
      }}
      onClick={onClick}
    >
      {/* Card top banner with discount color */}
      <div className="card-banner" style={{ background: COLOR_GRADIENT[card.discount] }}>
        <span className="card-points-display" style={{ color: isWhite ? '#333' : '#fff' }}>
          {card.points > 0 ? card.points : ''}
        </span>
        <span className="card-gem-icon" style={{ color: isWhite ? '#666' : 'rgba(255,255,255,0.6)' }}>
          {GEM_ICONS[card.discount]}
        </span>
      </div>

      {/* Cost gems */}
      <div className="card-cost-area">
        {costs.map(([color, count]) => (
          <div key={color} className="gem-cost">
            <div className="gem-cost-circle" style={{
              background: `radial-gradient(circle at 35% 35%, ${lighten(COLOR_MAP[color])}, ${COLOR_MAP[color]})`,
              color: color === 'white' ? '#333' : '#fff',
              border: color === 'white' ? '1.5px solid #bbb' : '1.5px solid rgba(255,255,255,0.2)',
            }}>
              {count}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 0.45;
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))}, ${Math.min(255, Math.round(g + (255 - g) * f))}, ${Math.min(255, Math.round(b + (255 - b) * f))})`;
}

export { COLOR_MAP, COLOR_EMOJI, COLOR_GRADIENT, GEM_ICONS };
