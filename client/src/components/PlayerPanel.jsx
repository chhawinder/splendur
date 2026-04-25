import { COLOR_MAP } from './Card';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

export default function PlayerPanel({ player, isCurrentTurn, isMe }) {
  const cardsByColor = {};
  for (const card of player.cards) {
    if (!cardsByColor[card.discount]) cardsByColor[card.discount] = [];
    cardsByColor[card.discount].push(card);
  }

  return (
    <div className={`player-panel ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'is-me' : ''} ${player.resigned ? 'resigned' : ''}`}>
      <div className="player-header">
        <div className="player-name-row">
          {isCurrentTurn && !player.resigned && <span className="turn-arrow">▶</span>}
          <span className="player-name">{player.name}</span>
          {isMe && <span className="you-tag">You</span>}
          {player.resigned && <span className="resigned-tag">Resigned</span>}
        </div>
        <span className="player-points-big">{player.points}</span>
      </div>

      {/* Gem columns: each color shows token + purchased cards below */}
      <div className="player-gem-columns">
        {COLORS.map(color => {
          const cards = cardsByColor[color] || [];
          const chipCount = player.chips[color];
          return (
            <div key={color} className="gem-column">
              <div className="gem-token" style={{
                background: `radial-gradient(circle at 35% 35%, ${lighten(COLOR_MAP[color])}, ${COLOR_MAP[color]})`,
                color: color === 'white' ? '#333' : '#fff',
                border: color === 'white' ? '2px solid #ccc' : '2px solid rgba(255,255,255,0.15)'
              }}>
                <span className="gem-count">{chipCount}</span>
              </div>
              {cards.length > 0 && (
                <div className="gem-cards-stack">
                  {cards.map((card, i) => (
                    <div
                      key={card.id}
                      className="gem-mini-card"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR_MAP[color]}dd, ${COLOR_MAP[color]}99)`,
                        color: color === 'white' ? '#333' : '#fff',
                        border: color === 'white' ? '1.5px solid #bbb' : '1.5px solid rgba(255,255,255,0.2)',
                        marginTop: i > 0 ? '-14px' : '0',
                        zIndex: i,
                      }}
                    >
                      {card.points > 0 ? card.points : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {player.chips.gold > 0 && (
          <div className="gem-column">
            <div className="gem-token gem-gold">
              <span className="gem-count">{player.chips.gold}</span>
            </div>
          </div>
        )}
      </div>

      <div className="player-meta">
        <span>{player.cards.length} cards</span>
        <span>{player.reservedCount || (player.reserved || []).length} held</span>
        <span>{player.bonusTiles?.length || 0} tiles</span>
      </div>
    </div>
  );
}

function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 0.4;
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))}, ${Math.min(255, Math.round(g + (255 - g) * f))}, ${Math.min(255, Math.round(b + (255 - b) * f))})`;
}
