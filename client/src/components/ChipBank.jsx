import { useState, useRef } from 'react';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

// Premium 3D gem styles for chip bank
export const GEM_STYLES = {
  black: {
    bg: 'radial-gradient(circle at 30% 25%, #4a4a6a, #1a1a2e 70%)',
    glow: 'rgba(212,175,55,0.35)',
    border: '3px solid rgba(212,175,55,0.4)',
    color: '#d4af37',
    shadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(212,175,55,0.1)',
  },
  white: {
    bg: 'radial-gradient(circle at 30% 25%, #ffffff, #d8d8d0 50%, #b0b0a8 100%)',
    glow: 'rgba(255,255,255,0.3)',
    border: '3px solid rgba(180,180,180,0.6)',
    color: '#444',
    shadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 6px rgba(255,255,255,0.5)',
  },
  blue: {
    bg: 'radial-gradient(circle at 30% 25%, #5b9bd5, #0f3460 65%, #082040 100%)',
    glow: 'rgba(107,163,214,0.35)',
    border: '3px solid rgba(107,163,214,0.4)',
    color: '#e8f4f8',
    shadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(107,163,214,0.15)',
  },
  green: {
    bg: 'radial-gradient(circle at 30% 25%, #3aa88a, #16423c 65%, #0e2e28 100%)',
    glow: 'rgba(201,160,99,0.3)',
    border: '3px solid rgba(201,160,99,0.35)',
    color: '#c9f5e0',
    shadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(90,170,138,0.15)',
  },
  red: {
    bg: 'radial-gradient(circle at 30% 25%, #e04040, #8b0000 65%, #5c0000 100%)',
    glow: 'rgba(255,150,150,0.3)',
    border: '3px solid rgba(255,204,203,0.35)',
    color: '#ffcccb',
    shadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,150,150,0.12)',
  },
};

export default function ChipBank({ bank, onTakeChips, isMyTurn, animating }) {
  const [selected, setSelected] = useState({});

  const totalSelected = Object.values(selected).reduce((s, v) => s + v, 0);

  function toggleChip(color) {
    if (!isMyTurn || animating) return;

    if (totalSelected === 0) {
      setSelected({ [color]: 1 });
    } else if (totalSelected === 1 && selected[color] === 1) {
      if (bank[color] >= 4) {
        setSelected({ [color]: 2 });
      }
    } else if (totalSelected === 1 && !selected[color]) {
      setSelected({ ...selected, [color]: 1 });
    } else if (totalSelected === 2) {
      const colors = Object.keys(selected).filter(c => selected[c] > 0);
      if (colors.length === 1 && colors[0] === color) {
        setSelected({});
      } else if (colors.length === 1 && selected[colors[0]] === 2) {
        return;
      } else if (!selected[color] && colors.length === 2) {
        setSelected({ ...selected, [color]: 1 });
      } else if (selected[color]) {
        const newSel = { ...selected };
        delete newSel[color];
        setSelected(newSel);
      }
    } else if (totalSelected === 3) {
      if (selected[color]) {
        const newSel = { ...selected };
        delete newSel[color];
        setSelected(newSel);
      }
    }
  }

  function confirm() {
    if (totalSelected < 1 || animating) return;
    onTakeChips(selected);
    setSelected({});
  }

  function clear() {
    if (animating) return;
    setSelected({});
  }

  const canConfirm = totalSelected >= 1;

  return (
    <div className="chip-bank">
      <div className="chip-bank-label">Gem Bank</div>
      <div className="chips-row">
        {COLORS.map(color => {
          const gs = GEM_STYLES[color];
          return (
            <div key={color} className="chip-stack">
              <div
                className={`gem-chip ${selected[color] ? 'gem-selected' : ''} ${bank[color] === 0 ? 'gem-empty' : ''}`}
                style={{
                  background: gs.bg,
                  color: gs.color,
                  border: gs.border,
                  boxShadow: selected[color]
                    ? `0 0 24px ${gs.glow}, ${gs.shadow}`
                    : gs.shadow,
                }}
                onClick={() => bank[color] > 0 && toggleChip(color)}
              >
                <span className="gem-chip-count">{bank[color]}</span>
                {selected[color] && (
                  <span className="gem-chip-badge">+{selected[color]}</span>
                )}
              </div>
              <span className="chip-stack-label">{color}</span>
            </div>
          );
        })}
        <div className="chip-stack">
          <div className="gem-chip gem-chip-gold" style={{
            background: 'radial-gradient(circle at 28% 22%, #fde68a, #d4af37 45%, #a67c00 100%)',
            color: '#5c3d00',
            border: '3px solid rgba(253,230,138,0.5)',
            boxShadow: '0 4px 14px rgba(164,124,0,0.4), inset 0 2px 6px rgba(253,230,138,0.25)',
          }}>
            <span className="gem-chip-count">{bank.gold}</span>
            <span className="gem-chip-star">&#9733;</span>
          </div>
          <span className="chip-stack-label">gold</span>
        </div>
      </div>

      {totalSelected > 0 && !animating && (
        <div className="chip-actions">
          <button className="btn-take" onClick={confirm} disabled={!canConfirm}>
            Take Gems
          </button>
          <button className="btn-secondary btn-sm" onClick={clear}>Clear</button>
        </div>
      )}
    </div>
  );
}
