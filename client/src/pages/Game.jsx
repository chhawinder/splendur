import { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../components/Card';
import ChipBank from '../components/ChipBank';
import PlayerPanel from '../components/PlayerPanel';
import ReturnChipsModal from '../components/ReturnChipsModal';
import ResignModal from '../components/ResignModal';
import BadgeNotification from '../components/BadgeNotification';
import { COST_COLORS } from '../components/Card';

// Gem glow colors for animations
const GEM_GLOW = {
  black: 'rgba(212,175,55,0.6)',
  white: 'rgba(200,200,200,0.6)',
  blue: 'rgba(107,163,214,0.6)',
  green: 'rgba(90,170,138,0.6)',
  red: 'rgba(224,96,96,0.6)',
};

const CARD_GLOW = {
  black: 'rgba(212,175,55,0.3)',
  white: 'rgba(200,200,200,0.3)',
  blue: 'rgba(107,163,214,0.3)',
  green: 'rgba(90,170,138,0.3)',
  red: 'rgba(224,96,96,0.3)',
};

const CARD_BG_SOLID = {
  black: 'linear-gradient(165deg, #2a2a3e, #1a1a2e)',
  white: 'linear-gradient(165deg, #f5f5f5, #e5e5e5)',
  blue: 'linear-gradient(165deg, #1e5aab, #0f3460)',
  green: 'linear-gradient(165deg, #1e6b5a, #16423c)',
  red: 'linear-gradient(165deg, #c41e3a, #8b0000)',
};

const CONFETTI_COLORS = ['#d4af37', '#f5d76e', '#e8f4f8', '#c9f5e0', '#ffcccb', '#a78bfa', '#5b9bd5', '#e04040'];

function createConfetti(x, y) {
  const pieces = [];
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 160;
    pieces.push({
      id: `${i}_${Date.now()}`,
      x: `${x}px`,
      y: `${y}px`,
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 60}px`,
      rot: `${360 + Math.random() * 720}deg`,
      size: `${5 + Math.random() * 7}px`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: `${Math.random() * 150}ms`,
      shape: Math.random() > 0.5 ? 'confetti-circle' : 'confetti-rect',
    });
  }
  return pieces;
}

export default function Game({ socket, gameId, userId, isSpectating, onLeave }) {
  const [gameState, setGameState] = useState(null);
  const [showReturn, setShowReturn] = useState(false);
  const [returnChips, setReturnChipsData] = useState(null);
  const [actionError, setActionError] = useState('');
  const [showReserved, setShowReserved] = useState(false);
  const [showResign, setShowResign] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newBadges, setNewBadges] = useState(null);
  const [flyingCards, setFlyingCards] = useState([]);
  const [flyingNobles, setFlyingNobles] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const cardRefs = useRef({});
  const tileRefs = useRef({});
  const prevBonusTiles = useRef(null);
  const prevPlayerCards = useRef(null);

  // Detect newly purchased cards & newly claimed nobles
  const animateCardPurchase = useCallback((cardId, color) => {
    const sourceEl = cardRefs.current[cardId];
    const targetEl = document.querySelector('.player-panel.is-me');
    if (!sourceEl || !targetEl) return;

    const sr = sourceEl.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();

    setFlyingCards(prev => [...prev, {
      id: `card_${cardId}_${Date.now()}`,
      startX: sr.left,
      startY: sr.top,
      endX: tr.left + tr.width / 2 - 60,
      endY: tr.top + tr.height / 2,
      color,
      bg: CARD_BG_SOLID[color],
      glow: CARD_GLOW[color],
    }]);

    setTimeout(() => {
      setFlyingCards(prev => prev.filter(c => !c.id.startsWith(`card_${cardId}`)));
    }, 750);
  }, []);

  const animateNobleClaim = useCallback((tileId) => {
    const sourceEl = tileRefs.current[tileId];
    const targetEl = document.querySelector('.player-panel.is-me');
    if (!sourceEl || !targetEl) return;

    const sr = sourceEl.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    const cx = sr.left + sr.width / 2;
    const cy = sr.top + sr.height / 2;

    // Confetti burst from tile position
    setConfetti(createConfetti(cx, cy));
    setTimeout(() => setConfetti([]), 1400);

    // Fly noble to player
    setFlyingNobles(prev => [...prev, {
      id: `noble_${tileId}_${Date.now()}`,
      startX: sr.left,
      startY: sr.top,
      endX: tr.left + tr.width / 2 - 40,
      endY: tr.top + 10,
      width: sr.width,
      height: sr.height,
    }]);

    setTimeout(() => {
      setFlyingNobles(prev => prev.filter(n => !n.id.startsWith(`noble_${tileId}`)));
    }, 900);
  }, []);

  useEffect(() => {
    // Request current game state on mount (in case we missed the initial emit)
    socket.emit('getGameState', { gameId });

    socket.on('gameState', (state) => {
      // Detect card purchases for animation
      if (prevPlayerCards.current && !isSpectating) {
        const me = state.players.find(p => p.id === userId);
        const prevMe = prevPlayerCards.current;
        if (me && prevMe) {
          const prevIds = new Set(prevMe.map(c => c.id));
          const newCards = me.cards.filter(c => !prevIds.has(c.id));
          for (const card of newCards) {
            animateCardPurchase(card.id, card.discount);
          }
        }
      }

      // Detect noble tile claims for animation
      if (prevBonusTiles.current && !isSpectating) {
        for (const tile of state.bonusTiles) {
          const prev = prevBonusTiles.current.find(t => t.id === tile.id);
          if (tile.claimedBy === userId && prev && prev.claimedBy !== userId) {
            animateNobleClaim(tile.id);
          }
        }
      }

      // Store previous state for diff
      const meNow = state.players.find(p => p.id === userId);
      prevPlayerCards.current = meNow ? [...meNow.cards] : null;
      prevBonusTiles.current = [...state.bonusTiles];

      setGameState(state);
      setActionError('');
      if (state.newBadges && state.newBadges.length > 0) {
        setNewBadges(state.newBadges);
      }
    });
    socket.on('gameNotFound', () => {
      // Game was cleaned up — go back to lobby
      onLeave();
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
      socket.off('gameNotFound');
      socket.off('needsReturn');
      socket.off('actionError');
    };
  }, [socket, userId, isSpectating, gameId, onLeave, animateCardPurchase, animateNobleClaim]);

  if (!gameState) return <div className="loading">Loading game...</div>;

  const me = isSpectating ? null : gameState.players.find(p => p.id === userId);
  const isMyTurn = !isSpectating && gameState.currentPlayerId === userId;
  const gameActive = gameState.phase !== 'ended' && me && !me.resigned;

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

  function handleBackToLobby() {
    if (gameActive) {
      setShowResign(true);
    } else {
      onLeave();
    }
  }

  function confirmResign() {
    socket.emit('resign', { gameId });
    setShowResign(false);
    onLeave();
  }

  return (
    <div className="game-page">
      {isSpectating && (
        <div className="spectator-banner">Spectating</div>
      )}

      {gameState.phase === 'ended' && (
        <div className="game-over-banner">
          <div className="game-over-title">
            {!isSpectating && gameState.winner === userId
              ? '🎉 You Win!'
              : `Game Over - ${gameState.players.find(p => p.id === gameState.winner)?.name} wins!`}
          </div>
          {!isSpectating && gameState.ratingChanges && gameState.ratingChanges[userId] && (
            <div className="rating-change">
              Rating: {gameState.ratingChanges[userId].newRating} ({gameState.ratingChanges[userId].change})
            </div>
          )}
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
              <div
                key={tile.id}
                ref={el => tileRefs.current[tile.id] = el}
                className={`bonus-tile ${tile.claimed ? 'claimed' : ''}`}
              >
                <span className="tile-points">{tile.points} pts</span>
                <div className="tile-condition">
                  {Object.entries(tile.condition).map(([color, count]) => {
                    const cc = COST_COLORS[color];
                    return (
                      <div
                        key={color}
                        className="tile-cond-gem"
                        style={{
                          background: `radial-gradient(circle at 30% 25%, ${cc.highlight}, ${cc.bg})`,
                          color: cc.text,
                          border: `1.5px solid ${cc.border}`,
                        }}
                      >
                        {count}
                      </div>
                    );
                  })}
                </div>
                {tile.claimedBy && (
                  <span className="tile-owner">
                    {gameState.players.find(p => p.id === tile.claimedBy)?.name}
                  </span>
                )}
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
                <div
                  key={card.id}
                  className="card-wrapper"
                  ref={el => cardRefs.current[card.id] = el}
                >
                  <Card
                    card={card}
                    onClick={() => isMyTurn && setSelectedCard(card)}
                  />
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
                  <Card card={card} small />
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
            {isSpectating
              ? `${gameState.players[gameState.currentPlayerIndex]?.name}'s turn`
              : isMyTurn ? "🟢 Your turn!" : `Waiting for ${gameState.players[gameState.currentPlayerIndex]?.name}...`}
          </div>

          <button
            className={gameActive ? 'btn-danger btn-resign' : 'btn-secondary btn-resign'}
            onClick={handleBackToLobby}
          >
            {isSpectating ? 'Stop Watching' : gameActive ? 'Resign & Leave' : 'Back to Lobby'}
          </button>
        </div>
      </div>

      {/* Card action modal */}
      {selectedCard && (
        <div className="card-modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="card-modal" onClick={e => e.stopPropagation()}>
            <button className="card-modal-close" onClick={() => setSelectedCard(null)}>&times;</button>
            <div className="card-modal-preview">
              <Card card={selectedCard} />
            </div>
            <div className="card-modal-actions">
              <button className="btn-card-buy" onClick={() => {
                handlePurchase(selectedCard.id);
                setSelectedCard(null);
              }}>Buy</button>
              <button className="btn-card-hold" onClick={() => {
                handleReserve(selectedCard.id);
                setSelectedCard(null);
              }}>Hold</button>
            </div>
          </div>
        </div>
      )}

      {showReturn && returnChips && (
        <ReturnChipsModal currentChips={returnChips} onReturn={handleReturn} />
      )}

      {showResign && (
        <ResignModal onConfirm={confirmResign} onCancel={() => setShowResign(false)} />
      )}

      {newBadges && (
        <BadgeNotification badges={newBadges} onDone={() => setNewBadges(null)} />
      )}

      {/* Flying card animations */}
      {flyingCards.map(fc => (
        <div
          key={fc.id}
          className="flying-card"
          style={{
            '--start-x': `${fc.startX}px`,
            '--start-y': `${fc.startY}px`,
            '--end-x': `${fc.endX}px`,
            '--end-y': `${fc.endY}px`,
            '--card-glow': fc.glow,
            background: fc.bg,
            border: `1.5px solid ${CARD_GLOW[fc.color]}`,
          }}
        />
      ))}

      {/* Flying noble animations */}
      {flyingNobles.map(fn => (
        <div
          key={fn.id}
          className="flying-noble"
          style={{
            '--start-x': `${fn.startX}px`,
            '--start-y': `${fn.startY}px`,
            '--end-x': `${fn.endX}px`,
            '--end-y': `${fn.endY}px`,
            width: fn.width,
            height: fn.height,
            background: 'linear-gradient(145deg, rgba(26,26,46,0.9), rgba(13,13,26,0.95))',
            border: '1.5px solid rgba(212,175,55,0.4)',
            borderRadius: '14px',
            boxShadow: '0 8px 30px rgba(212,175,55,0.3)',
          }}
        />
      ))}

      {/* Confetti */}
      {confetti.length > 0 && (
        <div className="confetti-container">
          {confetti.map(p => (
            <div
              key={p.id}
              className={`confetti-piece ${p.shape}`}
              style={{
                '--x': p.x,
                '--y': p.y,
                '--dx': p.dx,
                '--dy': p.dy,
                '--rot': p.rot,
                '--size': p.size,
                '--color': p.color,
                '--delay': p.delay,
                background: p.color,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
