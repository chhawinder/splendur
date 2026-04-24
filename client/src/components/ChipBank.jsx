import { useState } from 'react';
import { COLOR_MAP } from './Card';

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

export default function ChipBank({ bank, onTakeChips, isMyTurn }) {
  const [selected, setSelected] = useState({});

  const totalSelected = Object.values(selected).reduce((s, v) => s + v, 0);

  function toggleChip(color) {
    if (!isMyTurn) return;
    const current = selected[color] || 0;

    if (totalSelected === 0) {
      setSelected({ [color]: 1 });
    } else if (totalSelected === 1 && selected[color] === 1) {
      // Trying to take 2 of same color
      if (bank[color] >= 4) {
        setSelected({ [color]: 2 });
      }
    } else if (totalSelected === 1 && !selected[color]) {
      setSelected({ ...selected, [color]: 1 });
    } else if (totalSelected === 2) {
      const colors = Object.keys(selected).filter(c => selected[c] > 0);
      if (colors.length === 1 && colors[0] === color) {
        // Deselect
        setSelected({});
      } else if (colors.length === 1 && selected[colors[0]] === 2) {
        // Already taking 2 of one color, can't add more
        return;
      } else if (!selected[color] && colors.length === 2) {
        setSelected({ ...selected, [color]: 1 });
      } else if (selected[color]) {
        const newSel = { ...selected };
        delete newSel[color];
        setSelected(newSel);
      }
    } else if (totalSelected === 3) {
      // Deselect
      if (selected[color]) {
        const newSel = { ...selected };
        delete newSel[color];
        setSelected(newSel);
      }
    }
  }

  function confirm() {
    if (totalSelected < 2) return;
    onTakeChips(selected);
    setSelected({});
  }

  function clear() {
    setSelected({});
  }

  const canConfirm = totalSelected === 3 || (totalSelected === 2 && Object.keys(selected).filter(c => selected[c] > 0).length === 1);

  return (
    <div className="chip-bank">
      <h3>Gem Bank</h3>
      <div className="chips-row">
        {COLORS.map(color => (
          <div
            key={color}
            className={`chip ${selected[color] ? 'chip-selected' : ''} ${bank[color] === 0 ? 'chip-empty' : ''}`}
            style={{ background: COLOR_MAP[color], color: color === 'white' ? '#333' : '#fff' }}
            onClick={() => bank[color] > 0 && toggleChip(color)}
          >
            <span className="chip-count">{bank[color]}</span>
            {selected[color] && <span className="chip-badge">+{selected[color]}</span>}
          </div>
        ))}
        <div
          className="chip chip-gold"
          style={{ background: '#eab308', color: '#333' }}
        >
          <span className="chip-count">{bank.gold}</span>
          <span className="chip-label">G</span>
        </div>
      </div>
      {totalSelected > 0 && (
        <div className="chip-actions">
          <button className="btn-primary btn-sm" onClick={confirm} disabled={!canConfirm}>
            Take Chips
          </button>
          <button className="btn-secondary btn-sm" onClick={clear}>Clear</button>
        </div>
      )}
    </div>
  );
}
