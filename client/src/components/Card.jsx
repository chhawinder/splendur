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

export default function Card({ card, onClick, affordable, small }) {
  if (!card || card.hidden) {
    return (
      <div className={`card card-hidden ${small ? 'card-small' : ''}`} onClick={onClick}>
        <span>?</span>
      </div>
    );
  }

  const costs = Object.entries(card.cost || {}).filter(([, v]) => v > 0);

  return (
    <div
      className={`card ${small ? 'card-small' : ''} ${affordable ? 'card-affordable' : ''}`}
      style={{ borderTop: `4px solid ${COLOR_MAP[card.discount]}` }}
      onClick={onClick}
    >
      <div className="card-header">
        <span className="card-points">{card.points > 0 ? card.points : ''}</span>
        <span className="card-discount" style={{ background: COLOR_MAP[card.discount] }}>
          {COLOR_EMOJI[card.discount]}
        </span>
      </div>
      <div className="card-costs">
        {costs.map(([color, count]) => (
          <div key={color} className="cost-item">
            <span className="cost-count">{count}</span>
            <span className="cost-dot" style={{ background: COLOR_MAP[color] }}></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { COLOR_MAP, COLOR_EMOJI };
