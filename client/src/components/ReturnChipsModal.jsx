import { useState } from 'react';
import { GEM_STYLES } from './ChipBank';

const ALL_COLORS = ['black', 'white', 'blue', 'green', 'red', 'gold'];

export default function ReturnChipsModal({ currentChips, onReturn, onCancel }) {
  const [returning, setReturning] = useState({});
  const total = Object.values(currentChips).reduce((s, v) => s + v, 0);
  const returnTotal = Object.values(returning).reduce((s, v) => s + v, 0);
  const remaining = total - returnTotal;
  const mustReturn = total - 10;

  function adjust(color, delta) {
    const current = returning[color] || 0;
    const newVal = current + delta;
    if (newVal < 0 || newVal > currentChips[color]) return;
    // Don't allow returning more than needed
    if (delta > 0 && returnTotal >= mustReturn) return;
    setReturning({ ...returning, [color]: newVal });
  }

  const goldStyle = {
    bg: 'radial-gradient(circle at 28% 22%, #fde68a, #d4af37 45%, #a67c00 100%)',
    color: '#5c3d00',
    border: '3px solid rgba(253,230,138,0.5)',
    shadow: '0 4px 14px rgba(164,124,0,0.4)',
  };

  function getStyle(color) {
    if (color === 'gold') return goldStyle;
    return GEM_STYLES[color] || {};
  }

  return (
    <div className="return-modal-overlay">
      <div className="return-modal">
        <div className="return-modal-header">
          <h3>Too Many Gems!</h3>
          <p>You have <strong>{total}</strong> gems. Return <strong>{mustReturn}</strong> to get back to 10.</p>
        </div>

        <div className="return-modal-progress">
          <div className="return-progress-bar">
            <div
              className="return-progress-fill"
              style={{ width: `${Math.min(100, (returnTotal / mustReturn) * 100)}%` }}
            />
          </div>
          <span className="return-progress-text">
            {returnTotal} / {mustReturn} selected
          </span>
        </div>

        <div className="return-gems-grid">
          {ALL_COLORS.map(color => {
            if (!currentChips[color] || currentChips[color] <= 0) return null;
            const gs = getStyle(color);
            const beingReturned = returning[color] || 0;
            const kept = currentChips[color] - beingReturned;

            return (
              <div key={color} className={`return-gem-row ${beingReturned > 0 ? 'returning' : ''}`}>
                <div className="return-gem-chip" style={{
                  background: gs.bg,
                  color: gs.color,
                  border: gs.border,
                  boxShadow: gs.shadow,
                }}>
                  <span>{kept}</span>
                </div>
                <span className="return-gem-label">{color}</span>
                <div className="return-gem-controls">
                  <button
                    className="return-btn"
                    onClick={() => adjust(color, -1)}
                    disabled={beingReturned <= 0}
                  >−</button>
                  <span className={`return-count ${beingReturned > 0 ? 'active' : ''}`}>
                    {beingReturned}
                  </span>
                  <button
                    className="return-btn"
                    onClick={() => adjust(color, 1)}
                    disabled={beingReturned >= currentChips[color] || returnTotal >= mustReturn}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="return-modal-actions">
          <button
            className="btn-return-confirm"
            disabled={remaining !== 10}
            onClick={() => onReturn(returning)}
          >
            Return {returnTotal} Gem{returnTotal !== 1 ? 's' : ''}
          </button>
          {onCancel && (
            <button className="btn-return-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
