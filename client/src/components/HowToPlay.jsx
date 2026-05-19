import { useState } from 'react';

const GEM_TYPES = [
  { name: 'Diamond', color: '#e2e8f0' },
  { name: 'Emerald', color: '#22c55e' },
  { name: 'Ruby', color: '#ef4444' },
  { name: 'Sapphire', color: '#3b82f6' },
  { name: 'Onyx', color: '#1e293b', border: '#64748b' },
  { name: 'Gold', color: '#eab308', wild: true },
];

const SECTIONS = [
  {
    num: 1,
    name: 'Objective',
    content: (
      <>
        <p>
          <span className="htp-highlight">2 to 4 players</span> compete to collect gem tokens and
          purchase development cards. Each card you buy gives you{' '}
          <span className="htp-highlight">prestige points</span> and a permanent gem bonus that
          reduces the cost of future purchases.
        </p>
        <p>
          The board features <span className="htp-highlight">3 tiers</span> of development cards (4
          face-up per tier), noble tiles, and a shared gem bank with 5 gem colors plus gold
          (wild/joker) tokens.
        </p>
        <p>
          Be the first to reach <span className="htp-highlight">15 prestige points</span> to trigger
          the final round!
        </p>
      </>
    ),
  },
  {
    num: 2,
    name: 'Take Gems',
    content: (
      <>
        <p>On your turn you may collect gem tokens from the bank:</p>
        <ul>
          <li>
            Take <span className="htp-highlight">3 gems of different colors</span>, OR
          </li>
          <li>
            Take <span className="htp-highlight">2 gems of the same color</span> (only if there are
            4 or more tokens of that color available).
          </li>
        </ul>
        <p>
          You may hold a maximum of <span className="htp-highlight">10 tokens</span> at a time. If
          taking gems puts you over the limit, you must return the excess before your turn ends.
        </p>
      </>
    ),
  },
  {
    num: 3,
    name: 'Reserve a Card',
    content: (
      <>
        <p>
          Instead of taking gems, you may reserve a card for later purchase:
        </p>
        <ul>
          <li>
            Pick any <span className="htp-highlight">face-up card</span> from the board, or draw the{' '}
            <span className="htp-highlight">top card of any deck</span> (blind reserve).
          </li>
          <li>
            You receive <span className="htp-highlight">1 gold (wild) token</span> as a bonus.
          </li>
          <li>
            Maximum of <span className="htp-highlight">3 reserved cards</span> in hand at a time.
          </li>
        </ul>
        <p>
          Reserved cards are hidden from opponents and can only be purchased by you.
        </p>
      </>
    ),
  },
  {
    num: 4,
    name: 'Purchase a Card',
    content: (
      <>
        <p>Buy a face-up card from the board or one of your reserved cards:</p>
        <ul>
          <li>
            Pay the card's gem cost using your tokens.{' '}
            <span className="htp-highlight">Gold tokens are wild</span> and can substitute for any
            color.
          </li>
          <li>
            Cards you already own provide{' '}
            <span className="htp-highlight">permanent gem bonuses</span> that count toward the cost
            of future cards (you don't spend them).
          </li>
          <li>
            The card's <span className="htp-highlight">prestige points</span> (if any) are added to
            your score immediately.
          </li>
        </ul>
      </>
    ),
  },
  {
    num: 5,
    name: 'Nobles',
    content: (
      <>
        <p>
          Noble tiles sit at the top of the board and are{' '}
          <span className="htp-highlight">worth 3 prestige points each</span>.
        </p>
        <p>
          At the <span className="htp-highlight">end of your turn</span>, if your owned card
          bonuses meet or exceed a noble's requirements, that noble{' '}
          <span className="htp-highlight">automatically visits you</span> (no action needed).
        </p>
        <p>
          If you qualify for multiple nobles at once, you receive one per turn.
        </p>
      </>
    ),
  },
  {
    num: 6,
    name: 'Winning',
    content: (
      <>
        <p>
          When any player reaches{' '}
          <span className="htp-highlight">15 or more prestige points</span>, the current round is
          completed so that all players have an{' '}
          <span className="htp-highlight">equal number of turns</span>.
        </p>
        <p>
          The player with the <span className="htp-highlight">highest score</span> wins. In case of
          a tie, the player who purchased fewer development cards wins (more efficient engine).
        </p>
      </>
    ),
  },
  {
    num: 7,
    name: 'Strategy Tips',
    content: (
      <div className="htp-grid">
        <div className="htp-tip-card">
          <strong>Build early</strong>
          <p>Focus on cheap Tier 1 cards to build your gem engine before going for expensive cards.</p>
        </div>
        <div className="htp-tip-card">
          <strong>Watch opponents</strong>
          <p>Track which colors your opponents are collecting and block their plans when possible.</p>
        </div>
        <div className="htp-tip-card">
          <strong>Chase Nobles</strong>
          <p>Don't ignore Nobles -- they're free 3 prestige points with no action cost.</p>
        </div>
        <div className="htp-tip-card">
          <strong>Reserve wisely</strong>
          <p>Reserve high-value cards to deny opponents AND get a gold token as a bonus.</p>
        </div>
        <div className="htp-tip-card">
          <strong>Gold is precious</strong>
          <p>Gold tokens are wild but scarce. Save them for critical purchases.</p>
        </div>
      </div>
    ),
  },
];

export default function HowToPlay() {
  const [openSections, setOpenSections] = useState(new Set([1]));

  function toggleSection(num) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  }

  return (
    <div className="htp-page">
      <h1 className="htp-title">HOW TO PLAY</h1>
      <p className="htp-subtitle">Learn the rules of Splendur, a gem-collecting strategy game</p>

      <div className="htp-gems">
        {GEM_TYPES.map((gem) => (
          <div className="htp-gem" key={gem.name}>
            <span
              className="htp-gem-dot"
              style={{
                background: gem.color,
                border: gem.border ? `2px solid ${gem.border}` : undefined,
                boxShadow: `0 0 8px ${gem.color}44`,
              }}
            />
            <span className="htp-gem-label">
              {gem.name}
              {gem.wild && <em> (wild)</em>}
            </span>
          </div>
        ))}
      </div>

      <div className="htp-sections">
        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.num);
          return (
            <div
              className={`htp-section${isOpen ? ' htp-section-open' : ''}`}
              key={section.num}
            >
              <button className="htp-section-header" onClick={() => toggleSection(section.num)}>
                <span className="htp-section-num">{section.num}</span>
                <span className="htp-section-name">{section.name}</span>
                <span className="htp-section-chevron">{isOpen ? '\u25B2' : '\u25BC'}</span>
              </button>
              {isOpen && <div className="htp-section-body">{section.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
