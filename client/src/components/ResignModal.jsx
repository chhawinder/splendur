export default function ResignModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal resign-modal">
        <div className="resign-icon">🏳️</div>
        <h3>Resign Game?</h3>
        <p>Are you sure you want to surrender? Your opponent will be declared the winner and you'll lose rating points.</p>
        <div className="resign-buttons">
          <button className="btn-secondary" onClick={onCancel}>Keep Playing</button>
          <button className="btn-danger" onClick={onConfirm}>Resign</button>
        </div>
      </div>
    </div>
  );
}
