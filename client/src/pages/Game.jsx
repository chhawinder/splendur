import { useState, useEffect } from 'react';
import Card from '../components/Card';
import ChipBank from '../components/ChipBank';
import PlayerPanel from '../components/PlayerPanel';
import ReturnChipsModal from '../components/ReturnChipsModal';
import { COLOR_EMOJI } from '../components/Card';

export default function Game({ socket, gameId, userId }) {
  const [gameState, setGameState] = useState(null);
  const [showReturn, setShowReturn] = useState(false);
  const [returnChips, setReturnChipsData] = useState(null);
  const [actionError, setActionError] = useState('');
  const [showReserved, setShowReserved] = useState(false);

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
      setActionError('');
    });
    socket.on('needsReturn', ({ currentChips }) => {
      setReturnChipsData(currentChips);
      setShowReturn(true);
    });
    socket.on('actionError', ({ message }) => {
      setActionError(message);
      setTimeout(() => setActionError(''), 3000);
    });

    return () => {
      socket.off('gameState');
      socket.off('needsReturn');
      socket.off('actionError');
    };
  }, [socket]);

  if (!gameState) return <div className="loading">Loading game...</div>;

  const me = gameState.players.find(p => p.id === userId);
  const isMyTurn = gameState.currentPlayerId === userId;
  const canAffordCard = (card) => {
    if (!me || !card || card.hidden) return false;
    const discounts = {};
    for (const c of me.cards) {
      discounts[c.discount] = (discounts[c.discount] || 0) + 1;
    }
    let goldNeeded = 0;
    const colors = ['black', 'white', 'blue', 'green', 'red'];
    for (const color of colors) {
      const cost = card.cost?.[color] || 0;
      const disc = discounts[color] || 0;
      const effective = Math.max(0, cost - disc);
      const deficit = Math.max(0, effective - (me.chips[color] || 0));
      goldNeeded += deficit;
    }
    return goldNeeded <= (me.chips.gold || 0);
  };

  function handlePurchase(cardId) {
    if (!isMyTurn) return;
    socket.emit('purchaseCard', { gameId, cardId });
  }

  function handleReserve(cardId, fromDeck) {
    if (!isMyTurn) return;
    socket.emit('reserveCard', { gameId, cardId, fromDeck });
  }

  function handleTakeChips(chips) {
    if (!isMyTurn) return;
    socket.emit('takeChips', { gameId, chips });
  }

  function handleReturn(chips) {
    socket.emit('returnChips', { gameId, chips });
    setShowReturn(false);
  }

  return (
    <div className="game-page">
      {gameState.phase === 'ended' && (
        <div className="game-over-banner">
          {gameState.winner === userId ? '🎉 You Win!' : `Game Over - ${gameState.players.find(p => p.id === gameState.winner)?.name} wins!`}
        </div>
      )}

      {actionError && <div className="action-error">{actionError}</div>}

      <div className="game-layout">
        {/* Left: Players */}
        <div className="players-sidebar">
          {gameState.players.map(p => (
            <PlayerPanel
              key={p.id}
              player={p}
              isCurrentTurn={p.id === gameState.currentPlayerId}
              isMe={p.id === userId}
            />
          ))}
        </div>

        {/* Center: Board */}
        <div className="board-center">
          {/* Bonus Tiles */}
          <div className="bonus-tiles-row">
            {gameState.bonusTiles.map(tile => (
              <div key={tile.id} className={`bonus-tile ${tile.claimed ? 'claimed' : ''}`}>
                <span className="tile-points">{tile.points} pts</span>
                <div className="tile-condition">
                  {Object.entries(tile.condition).map(([color, count]) => (
                    <span key={color}>{COLOR_EMOJI[color]}{count}</span>
                  ))}
                </div>
                {tile.claimedBy && <span className="tile-owner">{gameState.players.find(p => p.id === tile.claimedBy)?.name}</span>}
              </div>
            ))}
          </div>

          {/* Card rows */}
          {['level3', 'level2', 'level1'].map(level => (
            <div key={level} className="card-row">
              <div
                className="deck-pile"
                onClick={() => isMyTurn && handleReserve(null, parseInt(level.replace('level', '')))}
                title="Reserve from deck"
              >
                <span className="deck-count">{gameState.deckCounts[level]}</span>
                <span className="deck-label">L{level.replace('level', '')}</span>
              </div>
              {gameState.board[level].map(card => (
                <div key={card.id} className="card-wrapper">
                  <Card
                    card={card}
                    affordable={canAffordCard(card)}
                    onClick={() => {
                      if (!isMyTurn) return;
                      if (canAffordCard(card)) handlePurchase(card.id);
                    }}
                  />
                  {isMyTurn && (
                    <div className="card-actions-overlay">
                      {canAffordCard(card) && (
                        <button className="btn-buy" onClick={() => handlePurchase(card.id)}>Buy</button>
                      )}
                      <button className="btn-reserve" onClick={() => handleReserve(card.id)}>Hold</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Chip Bank */}
          <ChipBank bank={gameState.bank} onTakeChips={handleTakeChips} isMyTurn={isMyTurn} />
        </div>

        {/* Right: My reserved cards + game log */}
        <div className="right-sidebar">
          {me && (
            <div className="my-reserved">
              <h3 onClick={() => setShowReserved(!showReserved)} style={{ cursor: 'pointer' }}>
                My Reserved ({me.reserved?.length || 0}/3) {showReserved ? '▼' : '▶'}
              </h3>
              {showReserved && me.reserved?.map(card => (
                <div key={card.id} className="card-wrapper">
                  <Card card={card} small affordable={canAffordCard(card)} />
                  {isMyTurn && canAffordCard(card) && (
                    <button className="btn-buy btn-sm" onClick={() => handlePurchase(card.id)}>Buy</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="game-log">
            <h3>Game Log</h3>
            {gameState.log.map((msg, i) => (
              <p key={i} className="log-entry">{msg}</p>
            ))}
          </div>

          <div className="turn-indicator">
            {isMyTurn ? "🟢 Your turn!" : `Waiting for ${gameState.players[gameState.currentPlayerIndex]?.name}...`}
          </div>
        </div>
      </div>

      {showReturn && returnChips && (
        <ReturnChipsModal currentChips={returnChips} onReturn={handleReturn} />
      )}
    </div>
  );
}
