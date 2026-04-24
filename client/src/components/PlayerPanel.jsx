import { COLOR_MAP, COLOR_EMOJI } from './Card';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

export default function PlayerPanel({ player, isCurrentTurn, isMe }) {
  const discounts = {};
  for (const card of player.cards) {
    discounts[card.discount] = (discounts[card.discount] || 0) + 1;
  }

  return (
    <div className={`player-panel ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'is-me' : ''}`}>
      <div className="player-header">
        <span className="player-name">{player.name} {isMe && '(You)'}</span>
        <span className="player-points">{player.points} pts</span>
      </div>
      <div className="player-chips">
        {COLORS.map(color => (
          <span key={color} className="mini-chip" style={{ background: COLOR_MAP[color], color: color === 'white' ? '#333' : '#fff' }}>
            {player.chips[color]}
          </span>
        ))}
        <span className="mini-chip" style={{ background: '#eab308', color: '#333' }}>
          {player.chips.gold}
        </span>
      </div>
      <div className="player-discounts">
        {COLORS.map(color => (
          discounts[color] ? (
            <span key={color} className="discount-badge">
              {COLOR_EMOJI[color]} {discounts[color]}
            </span>
          ) : null
        ))}
      </div>
      <div className="player-info-row">
        <span>{player.cards.length} cards</span>
        <span>{player.reservedCount || (player.reserved || []).length} reserved</span>
        <span>{player.bonusTiles?.length || 0} tiles</span>
      </div>
    </div>
  );
}
