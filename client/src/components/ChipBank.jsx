import { useState, useRef } from 'react';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

// Premium 3D gem styles for chip bank
const GEM_STYLES = {
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

export default function ChipBank({ bank, onTakeChips, isMyTurn }) {
  const [selected, setSelected] = useState({});
  const [flyingChips, setFlyingChips] = useState([]);
  const [landPulses, setLandPulses] = useState([]);
  const [animating, setAnimating] = useState(false);
  const chipRefs = useRef({});

  const totalSelected = Object.values(selected).reduce((s, v) => s + v, 0);

  function toggleChip(color) {
    if (!isMyTurn || animating) return;
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
    if (totalSelected < 2 || animating) return;
    setAnimating(true);

    // Find the target — the "is-me" player panel gem area
    const targetEl = document.querySelector('.player-panel.is-me .player-gem-columns');
    const targetRect = targetEl
      ? targetEl.getBoundingClientRect()
      : { left: window.innerWidth * 0.08, top: window.innerHeight * 0.15, width: 100, height: 30 };

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    // Collect chip info with staggered spawning
    const chipQueue = [];
    let idx = 0;
    for (const [color, count] of Object.entries(selected)) {
      if (count <= 0) continue;
      const sourceEl = chipRefs.current[color];
      const sourceRect = sourceEl
        ? sourceEl.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 68, height: 68 };

      const startX = sourceRect.left + sourceRect.width / 2;
      const startY = sourceRect.top + sourceRect.height / 2;

      for (let i = 0; i < count; i++) {
        chipQueue.push({
          id: `${color}_${i}_${Date.now()}`,
          color,
          startX,
          startY,
          endX: targetX,
          endY: targetY,
          spawnDelay: idx * 200,
        });
        idx++;
      }
    }

    // Spawn each chip with a staggered delay
    chipQueue.forEach(chip => {
      setTimeout(() => {
        setFlyingChips(prev => [...prev, chip]);

        // Remove this chip after its animation completes (1.3s)
        setTimeout(() => {
          setFlyingChips(prev => prev.filter(c => c.id !== chip.id));
        }, 1350);

        // Landing pulse when chip arrives (~950ms into animation)
        setTimeout(() => {
          const pulseId = `pulse_${chip.id}`;
          setLandPulses(prev => [...prev, {
            id: pulseId,
            x: targetX,
            y: targetY,
            color: GEM_STYLES[chip.color]?.glow || 'rgba(212,175,55,0.6)',
          }]);
          setTimeout(() => {
            setLandPulses(prev => prev.filter(p => p.id !== pulseId));
          }, 500);
        }, 950);
      }, chip.spawnDelay);
    });

    // After all animations done, send the action
    const lastSpawn = chipQueue.length > 0 ? chipQueue[chipQueue.length - 1].spawnDelay : 0;
    const totalDuration = lastSpawn + 1400;
    setTimeout(() => {
      onTakeChips(selected);
      setSelected({});
      setAnimating(false);
    }, totalDuration);
  }

  function clear() {
    if (animating) return;
    setSelected({});
  }

  const canConfirm = totalSelected === 3 || (totalSelected === 2 && Object.keys(selected).filter(c => selected[c] > 0).length === 1);

  return (
    <div className="chip-bank">
      <div className="chip-bank-label">Gem Bank</div>
      <div className="chips-row">
        {COLORS.map(color => {
          const gs = GEM_STYLES[color];
          return (
            <div key={color} className="chip-stack">
              <div
                ref={el => chipRefs.current[color] = el}
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

      {/* Flying chips — each spawned individually via setTimeout */}
      {flyingChips.map(chip => (
        <div
          key={chip.id}
          className="flying-chip"
          style={{
            '--start-x': `${chip.startX}px`,
            '--start-y': `${chip.startY}px`,
            '--end-x': `${chip.endX}px`,
            '--end-y': `${chip.endY}px`,
            background: GEM_STYLES[chip.color].bg,
            border: `2px solid ${GEM_STYLES[chip.color].glow}`,
          }}
        />
      ))}
      {/* Landing pulse effects */}
      {landPulses.map(pulse => (
        <div
          key={pulse.id}
          className="chip-land-pulse"
          style={{
            '--x': `${pulse.x}px`,
            '--y': `${pulse.y}px`,
            '--glow-color': pulse.color,
          }}
        />
      ))}
    </div>
  );
}
