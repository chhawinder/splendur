import { useState, useRef } from 'react';
import { COLOR_MAP } from './Card';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

function lighten(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 0.45;
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * f))}, ${Math.min(255, Math.round(g + (255 - g) * f))}, ${Math.min(255, Math.round(b + (255 - b) * f))})`;
}

export default function ChipBank({ bank, onTakeChips, isMyTurn }) {
  const [selected, setSelected] = useState({});
  const [flyingChips, setFlyingChips] = useState([]);
  const chipRefs = useRef({});
  const bankRef = useRef(null);

  const totalSelected = Object.values(selected).reduce((s, v) => s + v, 0);

  function toggleChip(color) {
    if (!isMyTurn) return;
    const current = selected[color] || 0;

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
    if (totalSelected < 2) return;

    // Find the target — the "is-me" player panel
    const targetEl = document.querySelector('.player-panel.is-me .player-gems');
    const targetRect = targetEl
      ? targetEl.getBoundingClientRect()
      : { left: window.innerWidth * 0.08, top: window.innerHeight * 0.15, width: 100, height: 30 };

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Create flying chips from their source positions
    const chips = [];
    let delay = 0;
    for (const [color, count] of Object.entries(selected)) {
      if (count <= 0) continue;
      const sourceEl = chipRefs.current[color];
      const sourceRect = sourceEl
        ? sourceEl.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 68, height: 68 };

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;

      for (let i = 0; i < count; i++) {
        chips.push({
          id: `${color}_${i}_${Date.now()}`,
          color,
          startX,
          startY,
          endX: targetX,
          endY: targetY,
          delay: delay * 100,
        });
        delay++;
      }
    }

    setFlyingChips(chips);

    // After animation completes, take chips
    const totalDuration = 600 + delay * 100;
    setTimeout(() => {
      onTakeChips(selected);
      setSelected({});
      setFlyingChips([]);
    }, totalDuration);
  }

  function clear() {
    setSelected({});
  }

  const canConfirm = totalSelected === 3 || (totalSelected === 2 && Object.keys(selected).filter(c => selected[c] > 0).length === 1);

  return (
    <div className="chip-bank" ref={bankRef}>
      <div className="chip-bank-label">Gem Bank</div>
      <div className="chips-row">
        {COLORS.map(color => (
          <div key={color} className="chip-stack">
            <div
              ref={el => chipRefs.current[color] = el}
              className={`gem-chip ${selected[color] ? 'gem-selected' : ''} ${bank[color] === 0 ? 'gem-empty' : ''}`}
              style={{
                background: `radial-gradient(circle at 30% 30%, ${lighten(COLOR_MAP[color])}, ${COLOR_MAP[color]})`,
                color: color === 'white' ? '#333' : '#fff',
                border: color === 'white' ? '3px solid #d4d4d4' : '3px solid rgba(255,255,255,0.15)',
                boxShadow: selected[color]
                  ? `0 0 20px ${COLOR_MAP[color]}88, 0 4px 12px rgba(0,0,0,0.4)`
                  : '0 4px 8px rgba(0,0,0,0.3)',
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
        ))}
        <div className="chip-stack">
          <div className="gem-chip gem-chip-gold" style={{
            background: 'radial-gradient(circle at 30% 30%, #fde047, #ca8a04)',
            color: '#78350f',
            border: '3px solid rgba(255,255,255,0.3)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
          }}>
            <span className="gem-chip-count">{bank.gold}</span>
            <span className="gem-chip-star">&#9733;</span>
          </div>
          <span className="chip-stack-label">gold</span>
        </div>
      </div>

      {totalSelected > 0 && (
        <div className="chip-actions">
          <button className="btn-take" onClick={confirm} disabled={!canConfirm}>
            Take Gems
          </button>
          <button className="btn-secondary btn-sm" onClick={clear}>Clear</button>
        </div>
      )}

      {/* Flying chips with real positions */}
      {flyingChips.map(chip => (
        <div
          key={chip.id}
          className="flying-chip"
          style={{
            '--start-x': `${chip.startX}px`,
            '--start-y': `${chip.startY}px`,
            '--end-x': `${chip.endX}px`,
            '--end-y': `${chip.endY}px`,
            animationDelay: `${chip.delay}ms`,
            background: `radial-gradient(circle at 30% 30%, ${lighten(COLOR_MAP[chip.color])}, ${COLOR_MAP[chip.color]})`,
            border: chip.color === 'white' ? '2px solid #ccc' : '2px solid rgba(255,255,255,0.2)',
          }}
        />
      ))}
    </div>
  );
}
