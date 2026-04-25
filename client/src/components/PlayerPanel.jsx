const COLORS = ['black', 'white', 'blue', 'green', 'red'];

// Gem token styles
const TOKEN_STYLES = {
  black: { bg: 'radial-gradient(circle at 32% 28%, #4a4a6a, #1a1a2e)', color: '#d4af37', border: '2px solid rgba(212,175,55,0.35)' },
  white: { bg: 'radial-gradient(circle at 32% 28%, #fff, #d8d8d0)', color: '#444', border: '2px solid rgba(180,180,180,0.5)' },
  blue:  { bg: 'radial-gradient(circle at 32% 28%, #5b9bd5, #0f3460)', color: '#e8f4f8', border: '2px solid rgba(107,163,214,0.35)' },
  green: { bg: 'radial-gradient(circle at 32% 28%, #3aa88a, #16423c)', color: '#c9f5e0', border: '2px solid rgba(201,160,99,0.3)' },
  red:   { bg: 'radial-gradient(circle at 32% 28%, #e04040, #8b0000)', color: '#ffcccb', border: '2px solid rgba(255,204,203,0.3)' },
};

const CARD_CHIP_STYLES = {
  black: { bg: 'linear-gradient(135deg, #2a2a3e, #1a1a2e)', color: '#d4af37', gemBg: 'radial-gradient(circle at 32% 28%, #4a4a6a, #1a1a2e)', gemColor: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' },
  white: { bg: 'linear-gradient(135deg, #e8e8e0, #d0d0c8)', color: '#555', gemBg: 'radial-gradient(circle at 32% 28%, #fff, #d8d8d0)', gemColor: '#555', border: '1px solid rgba(180,180,180,0.4)' },
  blue:  { bg: 'linear-gradient(135deg, #1e4a8a, #0f3460)', color: '#e8f4f8', gemBg: 'radial-gradient(circle at 32% 28%, #5b9bd5, #0f3460)', gemColor: '#e8f4f8', border: '1px solid rgba(107,163,214,0.25)' },
  green: { bg: 'linear-gradient(135deg, #1e6b5a, #16423c)', color: '#c9f5e0', gemBg: 'radial-gradient(circle at 32% 28%, #3aa88a, #16423c)', gemColor: '#c9f5e0', border: '1px solid rgba(90,170,138,0.25)' },
  red:   { bg: 'linear-gradient(135deg, #a81e1e, #8b0000)', color: '#ffcccb', gemBg: 'radial-gradient(circle at 32% 28%, #e04040, #8b0000)', gemColor: '#ffcccb', border: '1px solid rgba(255,150,150,0.25)' },
};

const GEM_ICONS = {
  black: '◆',
  white: '◇',
  blue: '💎',
  green: '🌿',
  red: '♦',
};

export default function PlayerPanel({ player, isCurrentTurn, isMe }) {
  const cardCounts = {};
  for (const card of player.cards) {
    cardCounts[card.discount] = (cardCounts[card.discount] || 0) + 1;
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

      {/* Gem columns — token on top, purchased card chip below */}
      <div className="player-gem-columns">
        {COLORS.map(color => {
          const chipCount = player.chips[color];
          const cardCount = cardCounts[color] || 0;
          const ts = TOKEN_STYLES[color];
          const cs = CARD_CHIP_STYLES[color];
          return (
            <div key={color} className="gem-column">
              <div className="gem-token" style={{
                background: ts.bg,
                color: ts.color,
                border: ts.border,
                boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.1)',
              }}>
                <span className="gem-count">{chipCount}</span>
              </div>
              {cardCount > 0 && (
                <div
                  className="player-card-chip"
                  style={{ background: cs.bg, color: cs.color, border: cs.border }}
                >
                  <div
                    className="player-card-gem"
                    style={{ background: cs.gemBg, color: cs.gemColor }}
                  >
                    {GEM_ICONS[color]}
                  </div>
                  <span className="player-card-count">{cardCount}</span>
                </div>
              )}
            </div>
          );
        })}
        {player.chips.gold > 0 && (
          <div className="gem-column">
            <div className="gem-token" style={{
              background: 'radial-gradient(circle at 28% 22%, #fde68a, #d4af37 50%, #a67c00)',
              color: '#5c3d00',
              border: '2px solid rgba(253,230,138,0.4)',
              boxShadow: '0 2px 6px rgba(164,124,0,0.35), inset 0 1px 3px rgba(253,230,138,0.2)',
            }}>
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
