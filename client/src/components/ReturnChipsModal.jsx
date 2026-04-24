import { useState } from 'react';
import { COLOR_MAP } from './Card';

const ALL_COLORS = ['black', 'white', 'blue', 'green', 'red', 'gold'];

export default function ReturnChipsModal({ currentChips, onReturn }) {
  const [returning, setReturning] = useState({});
  const total = Object.values(currentChips).reduce((s, v) => s + v, 0);
  const returnTotal = Object.values(returning).reduce((s, v) => s + v, 0);
  const remaining = total - returnTotal;

  function adjust(color, delta) {
    const current = returning[color] || 0;
    const newVal = current + delta;
    if (newVal < 0 || newVal > currentChips[color]) return;
    setReturning({ ...returning, [color]: newVal });
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Return Chips (must get down to 10)</h3>
        <p>You have {total} chips. Return {total - 10} chip{total - 10 > 1 ? 's' : ''}.</p>
        <div className="return-chips-grid">
          {ALL_COLORS.map(color => (
            currentChips[color] > 0 && (
              <div key={color} className="return-row">
                <span className="mini-chip" style={{
                  background: color === 'gold' ? '#eab308' : COLOR_MAP[color],
                  color: (color === 'white' || color === 'gold') ? '#333' : '#fff'
                }}>
                  {currentChips[color]}
                </span>
                <button onClick={() => adjust(color, -1)} disabled={(returning[color] || 0) <= 0}>-</button>
                <span>{returning[color] || 0}</span>
                <button onClick={() => adjust(color, 1)} disabled={(returning[color] || 0) >= currentChips[color]}>+</button>
              </div>
            )
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={remaining !== 10}
          onClick={() => onReturn(returning)}
        >
          Confirm Return ({returnTotal} chip{returnTotal !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
