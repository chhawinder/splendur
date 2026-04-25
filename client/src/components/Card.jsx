import { useTheme } from '../ThemeContext';

// === Premium color palette ===
const COLOR_MAP = {
  black: '#1a1a2e',
  white: '#f5f5f5',
  blue: '#0f3460',
  green: '#16423c',
  red: '#8b0000',
};

const COLOR_EMOJI = {
  black: '⚫',
  white: '⚪',
  blue: '🔵',
  green: '🟢',
  red: '🔴',
};

// Banner gradients — gem-inspired
const COLOR_GRADIENT = {
  black: 'linear-gradient(145deg, #2a2a3e 0%, #1a1a2e 40%, #0d0d1a 100%)',
  white: 'linear-gradient(145deg, #ffffff 0%, #f0ede6 40%, #e5e5e5 100%)',
  blue: 'linear-gradient(145deg, #1e5aab 0%, #0f3460 40%, #0a2444 100%)',
  green: 'linear-gradient(145deg, #1e6b5a 0%, #16423c 40%, #0e2e28 100%)',
  red: 'linear-gradient(145deg, #c41e3a 0%, #8b0000 40%, #5c0000 100%)',
};

// Card body — theme-aware backgrounds
const CARD_BODY_THEMES = {
  dark: {
    black: { bg: 'linear-gradient(165deg, rgba(26,26,46,0.85), rgba(13,13,26,0.95))', accent: '#d4af37', border: 'rgba(212,175,55,0.3)' },
    white: { bg: 'linear-gradient(165deg, rgba(245,245,245,0.9), rgba(229,229,229,0.95))', accent: '#b0b0b0', border: 'rgba(180,180,180,0.5)' },
    blue:  { bg: 'linear-gradient(165deg, rgba(15,52,96,0.8), rgba(10,36,68,0.95))', accent: '#e8f4f8', border: 'rgba(232,244,248,0.25)' },
    green: { bg: 'linear-gradient(165deg, rgba(22,66,60,0.8), rgba(14,46,40,0.95))', accent: '#c9a063', border: 'rgba(201,160,99,0.3)' },
    red:   { bg: 'linear-gradient(165deg, rgba(139,0,0,0.8), rgba(92,0,0,0.95))', accent: '#ffcccb', border: 'rgba(255,204,203,0.3)' },
  },
  champagne: {
    black: { bg: 'linear-gradient(165deg, #2a2a3e, #1a1a2e)', accent: '#d4af37', border: 'rgba(212,175,55,0.4)' },
    white: { bg: 'linear-gradient(165deg, #faf8f5, #ece8e0)', accent: '#a09080', border: 'rgba(180,155,100,0.4)' },
    blue:  { bg: 'linear-gradient(165deg, #1e5aab, #0f3460)', accent: '#e8f4f8', border: 'rgba(107,163,214,0.35)' },
    green: { bg: 'linear-gradient(165deg, #1e6b5a, #16423c)', accent: '#c9f5e0', border: 'rgba(90,170,138,0.35)' },
    red:   { bg: 'linear-gradient(165deg, #c41e3a, #8b0000)', accent: '#ffcccb', border: 'rgba(255,150,150,0.35)' },
  },
  burgundy: {
    black: { bg: 'linear-gradient(165deg, rgba(20,20,35,0.9), rgba(10,10,20,0.95))', accent: '#e8c46c', border: 'rgba(232,196,108,0.35)' },
    white: { bg: 'linear-gradient(165deg, rgba(245,240,235,0.92), rgba(225,220,210,0.95))', accent: '#8a7060', border: 'rgba(180,150,120,0.5)' },
    blue:  { bg: 'linear-gradient(165deg, rgba(20,80,170,0.85), rgba(10,40,100,0.95))', accent: '#a0d4f0', border: 'rgba(120,180,230,0.35)' },
    green: { bg: 'linear-gradient(165deg, rgba(15,100,80,0.85), rgba(10,60,50,0.95))', accent: '#80e8b8', border: 'rgba(80,200,140,0.35)' },
    red:   { bg: 'linear-gradient(165deg, rgba(200,30,50,0.85), rgba(140,0,0,0.95))', accent: '#ffb0b0', border: 'rgba(255,160,160,0.35)' },
  },
};

// Gem icons per color
// SVG gem icons for premium look
const OnyxGem = () => (
  <svg viewBox="0 0 32 32" width="1em" height="1em" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    {/* Emerald-cut rectangular onyx */}
    <polygon points="8,4 24,4 28,8 28,24 24,28 8,28 4,24 4,8" fill="#1a1018" />
    {/* Top facet — lightest */}
    <polygon points="8,4 24,4 21,9 11,9" fill="#3a2a3a" />
    {/* Right facet */}
    <polygon points="24,4 28,8 28,24 24,28 21,23 21,9" fill="#2a1a28" />
    {/* Bottom facet */}
    <polygon points="8,28 24,28 21,23 11,23" fill="#1a0a18" />
    {/* Left facet */}
    <polygon points="8,4 4,8 4,24 8,28 11,23 11,9" fill="#2e1e2e" />
    {/* Center table */}
    <rect x="11" y="9" width="10" height="14" fill="#221422" />
    {/* Shine highlights */}
    <polygon points="8,4 14,4 11,9" fill="white" opacity="0.2" />
    <line x1="11" y1="9" x2="21" y2="9" stroke="white" strokeWidth="0.6" opacity="0.25" />
    <line x1="11" y1="9" x2="11" y2="23" stroke="white" strokeWidth="0.4" opacity="0.15" />
  </svg>
);

const RubyGem = () => (
  <svg viewBox="0 0 32 32" width="1em" height="1em" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polygon points="16,1 30,12 25,30 7,30 2,12" fill="currentColor" opacity="0.85" />
    <polygon points="16,1 30,12 16,15 2,12" fill="currentColor" opacity="1" />
    <polygon points="16,15 30,12 25,30" fill="currentColor" opacity="0.55" />
    <polygon points="16,15 2,12 7,30" fill="currentColor" opacity="0.7" />
    <polygon points="16,15 7,30 25,30" fill="currentColor" opacity="0.45" />
    <polygon points="10,7 16,3 22,7 16,13" fill="white" opacity="0.3" />
    <line x1="16" y1="1" x2="16" y2="15" stroke="white" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

const GEM_ICONS = {
  black: <OnyxGem />,
  white: '◇',
  blue: '💎',
  green: '🌿',
  red: <RubyGem />,
};

// Cost circle colors — vivid gem tones for readability
const COST_COLORS = {
  black: { bg: '#1a1a2e', highlight: '#3a3a5a', text: '#d4af37', border: '#d4af37' },
  white: { bg: '#f0ede6', highlight: '#ffffff', text: '#555', border: '#b0b0b0' },
  blue:  { bg: '#0f3460', highlight: '#2a6cb8', text: '#e8f4f8', border: '#6ba3d6' },
  green: { bg: '#16423c', highlight: '#2a7a6a', text: '#c9f5e0', border: '#5aaa8a' },
  red:   { bg: '#8b0000', highlight: '#cc3333', text: '#ffcccb', border: '#e06060' },
};

export default function Card({ card, onClick, small }) {
  const { theme } = useTheme();

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
  const color = card.discount;
  const body = (CARD_BODY_THEMES[theme] || CARD_BODY_THEMES.dark)[color];
  const isWhite = color === 'white';

  return (
    <div
      className={`card card-${color} ${small ? 'card-small' : ''}`}
      style={{
        background: body.bg,
        borderColor: body.border,
      }}
      onClick={onClick}
    >
      {/* Veining/texture overlay */}
      <div className="card-texture" />

      {/* Banner */}
      <div className="card-banner" style={{ background: COLOR_GRADIENT[color] }}>
        {card.points > 0 ? (
          <span className="card-points-display" style={{
            color: body.accent,
            textShadow: isWhite ? 'none' : `0 0 12px ${body.accent}44`,
          }}>
            {card.points}
          </span>
        ) : <span />}
        <span className={`card-gem-icon card-gem-icon-${color}`}>
          {GEM_ICONS[color]}
        </span>
      </div>

      {/* Cost gems */}
      <div className="card-cost-area">
        {costs.map(([c, count]) => {
          const cc = COST_COLORS[c];
          return (
            <div key={c} className="gem-cost">
              <div className="gem-cost-circle" style={{
                background: `radial-gradient(circle at 30% 25%, ${cc.highlight}, ${cc.bg})`,
                color: cc.text,
                borderColor: cc.border,
                boxShadow: `0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.15)`,
              }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { COLOR_MAP, COLOR_EMOJI, COLOR_GRADIENT, GEM_ICONS, COST_COLORS };
