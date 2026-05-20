import { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../components/Card';
import ChipBank, { GEM_STYLES } from '../components/ChipBank';
import PlayerPanel from '../components/PlayerPanel';
import ReturnChipsModal from '../components/ReturnChipsModal';
import ResignModal from '../components/ResignModal';
import BadgeNotification from '../components/BadgeNotification';
import { COST_COLORS } from '../components/Card';
import VictoryScreen from '../components/VictoryScreen';
import { useTheme } from '../ThemeContext';

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
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
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

const NOBLE_FLY_STYLE = {
  dark: {
    background: 'linear-gradient(145deg, rgba(26,26,46,0.9), rgba(13,13,26,0.95))',
    border: '1.5px solid rgba(212,175,55,0.4)',
    boxShadow: '0 8px 30px rgba(212,175,55,0.3)',
  },
  champagne: {
    background: 'rgba(255,255,255,0.9)',
    border: '1.5px solid rgba(180,155,100,0.4)',
    boxShadow: '0 8px 30px rgba(160,132,74,0.3)',
  },
  burgundy: {
    background: 'linear-gradient(145deg, rgba(74,26,44,0.9), rgba(42,14,24,0.95))',
    border: '1.5px solid rgba(232,196,108,0.4)',
    boxShadow: '0 8px 30px rgba(232,196,108,0.3)',
  },
  luxury: {
    background: 'linear-gradient(145deg, rgba(60,30,10,0.95), rgba(30,14,5,0.98))',
    border: '1.5px solid rgba(212,175,55,0.5)',
    boxShadow: '0 8px 30px rgba(212,175,55,0.35)',
  },
};

export default function Game({ socket, gameId, userId, isSpectating, onLeave }) {
  const { theme } = useTheme();
  const [gameState, setGameState] = useState(null);
  const [showReturn, setShowReturn] = useState(false);
  const [returnChips, setReturnChipsData] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { type, data } for take/reserve before return
  const skipNextNeedsReturn = useRef(false);
  const [actionError, setActionError] = useState('');
  const [showReserved, setShowReserved] = useState(false);
  const [showResign, setShowResign] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newBadges, setNewBadges] = useState(null);
  const [flyingCards, setFlyingCards] = useState([]);
  const [flyingNobles, setFlyingNobles] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [highlightCards, setHighlightCards] = useState([]); // cards being highlighted before fly
  const [popupCard, setPopupCard] = useState(null); // card zooming to center before fly
  const [newBoardCards, setNewBoardCards] = useState(new Set()); // newly appeared cards
  const [hiddenBoardCards, setHiddenBoardCards] = useState(new Set()); // cards being removed (empty slot)
  const [gemPopup, setGemPopup] = useState(null);       // gems shown at center
  const [flyingGems, setFlyingGems] = useState([]);      // gems flying from center to panel
  const [returnFlyingGems, setReturnFlyingGems] = useState([]); // gems flying from player to bank on purchase
  const [gemAnimating, setGemAnimating] = useState(false);
  const [passAlert, setPassAlert] = useState(null); // { playerName } shown as red flash
  const [now, setNow] = useState(Date.now()); // updates every second for live timer display
  const serverOffset = useRef(0);    // client time - server time
  const cardRefs = useRef({});       // board card elements
  const reservedRefs = useRef({});   // reserved card elements
  const tileRefs = useRef({});
  const animBusyUntil = useRef(0);       // timestamp when current animations finish
  const pendingStates = useRef([]);       // queued gameState events waiting for animations
  const prevBonusTiles = useRef(null);
  const prevAllPlayers = useRef(null); // track ALL players' cards
  const prevBoardCards = useRef(null); // track board card IDs
  const prevBankSnapshot = useRef(null); // track bank for staged chip animation

  // Animate card purchase — popup to center with full card info, then fly to player panel
  const animateCardFly = useCallback((card, targetSelector) => {
    try {
      const cardId = card.id;
      const color = card.discount || 'black';
      const sourceEl = cardRefs.current[cardId] || reservedRefs.current[cardId];
      const targetEl = document.querySelector(targetSelector);
      if (!sourceEl || !targetEl) return;

      const tr = targetEl.getBoundingClientRect();

      // Phase 0: highlight card on board (600ms glow pulse)
      setHighlightCards([{ id: cardId, color }]);

      setTimeout(() => {
        setHighlightCards([]);
        // Re-check source element (may have been unmounted during reserve/purchase)
        const currentSourceEl = cardRefs.current[cardId] || reservedRefs.current[cardId];
        if (!currentSourceEl) {
          // Source gone — skip popup, just do the fly from center
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          setFlyingCards(prev => [...prev, {
            id: `card_${cardId}_${Date.now()}`,
            startX: cx - 75, startY: cy - 105,
            endX: tr.left + tr.width / 2 - 60, endY: tr.top + tr.height / 2,
            color, bg: CARD_BG_SOLID[color] || CARD_BG_SOLID.black, glow: CARD_GLOW[color] || CARD_GLOW.black,
          }]);
          setTimeout(() => setFlyingCards(prev => prev.filter(c => !c.id.startsWith(`card_${cardId}`))), 1600);
          return;
        }
        const sr = currentSourceEl.getBoundingClientRect();

        // Phase 1: zoom card from its position to screen center (1.4s)
        setPopupCard({
          cardData: card,
          color,
          glow: CARD_GLOW[color] || CARD_GLOW.black,
          startX: sr.left + sr.width / 2,
          startY: sr.top + sr.height / 2,
        });

        // Phase 2: after popup hold, fly from center to player panel
        setTimeout(() => {
          setPopupCard(null);

          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;

          setFlyingCards(prev => [...prev, {
            id: `card_${cardId}_${Date.now()}`,
            startX: cx - 75,
            startY: cy - 105,
            endX: tr.left + tr.width / 2 - 60,
            endY: tr.top + tr.height / 2,
            color,
            bg: CARD_BG_SOLID[color] || CARD_BG_SOLID.black,
            glow: CARD_GLOW[color] || CARD_GLOW.black,
          }]);

          setTimeout(() => {
            setFlyingCards(prev => prev.filter(c => !c.id.startsWith(`card_${cardId}`)));
          }, 1600);
        }, 1400);
      }, 600);
    } catch (err) {
      console.error('Animation error (non-fatal):', err);
      setHighlightCards([]);
      setPopupCard(null);
    }
  }, []);

  const animateNobleClaim = useCallback((tileId, targetSelector) => {
    const sourceEl = tileRefs.current[tileId];
    const targetEl = document.querySelector(targetSelector);
    if (!sourceEl || !targetEl) return;

    const sr = sourceEl.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    const cx = sr.left + sr.width / 2;
    const cy = sr.top + sr.height / 2;

    // Confetti burst from tile position
    setConfetti(createConfetti(cx, cy));
    setTimeout(() => setConfetti([]), 1800);

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
    }, 1400);
  }, []);

  useEffect(() => {
    // Request current game state on mount (in case we missed the initial emit)
    socket.emit('getGameState', { gameId });

    function processGameState(state) {
      let animationDelay = 0;

      // Detect card purchases for ALL players (highlight + fly + chip return animation)
      if (prevAllPlayers.current) {
        for (const player of state.players) {
          const prev = prevAllPlayers.current.find(p => p.id === player.id);
          if (!prev) continue;
          const prevIds = new Set(prev.cardIds);
          const newCards = player.cards.filter(c => !prevIds.has(c.id));
          if (newCards.length > 0) {
            const isMe = player.id === userId;
            const panelSelector = isMe
              ? '.player-panel.is-me'
              : `[data-player-id="${player.id}"]`;
            for (const card of newCards) {
              animateCardFly(card, panelSelector);
            }
            animationDelay = Math.max(animationDelay, 2900);

            // Detect chips spent (diff player's chips before/after)
            const spent = [];
            for (const color of ['black', 'white', 'blue', 'green', 'red', 'gold']) {
              const diff = (prev.chips[color] || 0) - (player.chips[color] || 0);
              if (diff > 0) spent.push({ color, count: diff });
            }

            if (spent.length > 0) {
              // After card fly finishes, fly gems from player panel to chip bank
              const returnDelay = 2900;
              setTimeout(() => {
                const panelEl = document.querySelector(panelSelector);
                const bankEl = document.querySelector('.chip-bank');
                const panelRect = panelEl
                  ? panelEl.getBoundingClientRect()
                  : { left: 100, top: 100, width: 100, height: 50 };
                const bankRect = bankEl
                  ? bankEl.getBoundingClientRect()
                  : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 200, height: 50 };

                const startX = panelRect.left + panelRect.width / 2;
                const startY = panelRect.top + panelRect.height / 2;
                const endX = bankRect.left + bankRect.width / 2;
                const endY = bankRect.top + bankRect.height / 2;

                const spacing = 55;
                const startOffset = -((spent.length - 1) * spacing) / 2;

                const gems = spent.map((s, i) => ({
                  id: `return_${s.color}_${i}_${Date.now()}`,
                  color: s.color,
                  count: s.count,
                  startX: startX + startOffset + i * spacing,
                  startY,
                  endX: endX + startOffset + i * spacing,
                  endY,
                }));
                setReturnFlyingGems(gems);
                setTimeout(() => setReturnFlyingGems([]), 1100);
              }, returnDelay);
              animationDelay = Math.max(animationDelay, returnDelay + 1200);
            }
          }
        }
      }

      // Detect card reservations for ALL players (highlight + popup + fly to reserved)
      if (prevAllPlayers.current) {
        for (const player of state.players) {
          const prev = prevAllPlayers.current.find(p => p.id === player.id);
          if (!prev) continue;
          const prevResIds = new Set(prev.reservedIds);
          const newReserved = (player.reserved || []).filter(c => c && c.id && !prevResIds.has(c.id));
          if (newReserved.length > 0) {
            const isMe = player.id === userId;
            if (isMe) setShowReserved(true); // auto-expand reserved section
            const targetSelector = isMe
              ? '.my-reserved'
              : `[data-player-id="${player.id}"]`;
            for (const card of newReserved) {
              // Only animate if card has full data (not hidden) and has a board ref
              if (!card.hidden && cardRefs.current[card.id]) {
                animateCardFly(card, targetSelector);
              }
            }
            animationDelay = Math.max(animationDelay, 2900);
          }
        }
      }

      // Detect gem takes for opponents (show popup + fly)
      if (prevAllPlayers.current) {
        for (const player of state.players) {
          if (player.id === userId) continue;
          const prev = prevAllPlayers.current.find(p => p.id === player.id);
          if (!prev || !prev.chips) continue;
          const gained = [];
          for (const color of ['black', 'white', 'blue', 'green', 'red', 'gold']) {
            const diff = (player.chips[color] || 0) - (prev.chips[color] || 0);
            if (diff > 0) {
              for (let i = 0; i < diff; i++) gained.push(color);
            }
          }
          if (gained.length > 0) {
            const panelSelector = `[data-player-id="${player.id}"]`;
            const targetEl = document.querySelector(panelSelector);
            const targetRect = targetEl
              ? targetEl.getBoundingClientRect()
              : { left: window.innerWidth * 0.08, top: window.innerHeight * 0.15, width: 100, height: 30 };
            const targetX = targetRect.left + targetRect.width / 2;
            const targetY = targetRect.top + targetRect.height / 2;

            setGemPopup(gained);
            setTimeout(() => {
              setGemPopup(null);
              const cx = window.innerWidth / 2;
              const cy = window.innerHeight / 2;
              const spacing = 80;
              const startOffset = -((gained.length - 1) * spacing) / 2;
              const newFlying = gained.map((color, i) => ({
                id: `opp_gem_${color}_${i}_${Date.now()}`,
                color,
                startX: cx + startOffset + i * spacing,
                startY: cy,
                endX: targetX,
                endY: targetY,
              }));
              setFlyingGems(newFlying);
              setTimeout(() => setFlyingGems([]), 1100);
            }, 900);

            animationDelay = Math.max(animationDelay, 2200);
          }
        }
      }

      // Detect noble tile claims — delay after card animation
      if (prevBonusTiles.current) {
        const nobleClaims = [];
        for (const tile of state.bonusTiles) {
          const prev = prevBonusTiles.current.find(t => t.id === tile.id);
          if (tile.claimedBy && prev && prev.claimedBy !== tile.claimedBy) {
            const isMe = tile.claimedBy === userId;
            const panelSelector = isMe
              ? '.player-panel.is-me'
              : `[data-player-id="${tile.claimedBy}"]`;
            nobleClaims.push({ tileId: tile.id, panelSelector });
          }
        }
        if (nobleClaims.length > 0) {
          const nobleStart = animationDelay > 0 ? animationDelay + 800 : 800;
          setTimeout(() => {
            for (const { tileId, panelSelector } of nobleClaims) {
              animateNobleClaim(tileId, panelSelector);
            }
          }, nobleStart);
          animationDelay = nobleStart + 1800;
        }
      }

      // Detect new replacement cards on the board
      if (prevBoardCards.current) {
        const addedIds = new Set();
        for (const level of ['level1', 'level2', 'level3']) {
          for (const card of state.board[level]) {
            if (!card.hidden && !prevBoardCards.current.has(card.id)) {
              addedIds.add(card.id);
            }
          }
        }
        if (addedIds.size > 0) {
          const stateDelay = animationDelay > 0 ? animationDelay : 0;
          setTimeout(() => setHiddenBoardCards(addedIds), stateDelay);
          setTimeout(() => {
            setHiddenBoardCards(new Set());
            setNewBoardCards(addedIds);
            setTimeout(() => setNewBoardCards(new Set()), 800);
          }, stateDelay + 1000);
        }
      }

      // Store previous state for diffing (always immediate)
      prevAllPlayers.current = state.players.map(p => ({
        id: p.id,
        cardIds: p.cards.map(c => c.id),
        reservedIds: (p.reserved || []).map(c => c.id),
        reserved: p.reserved || [],
        chips: { ...p.chips },
      }));
      prevBonusTiles.current = [...state.bonusTiles];
      const boardIds = new Set();
      for (const level of ['level1', 'level2', 'level3']) {
        for (const card of state.board[level]) {
          if (!card.hidden) boardIds.add(card.id);
        }
      }
      prevBoardCards.current = boardIds;

      // Detect if bank changed (chips taken or returned) — shallow compare
      let bankChanged = false;
      if (prevBankSnapshot.current) {
        for (const key of Object.keys(state.bank)) {
          if (prevBankSnapshot.current[key] !== state.bank[key]) {
            bankChanged = true;
            break;
          }
        }
      }
      prevBankSnapshot.current = state.bank;

      const applyState = () => {
        // Compute server-client time offset for accurate timer display
        if (state.serverTime) {
          serverOffset.current = Date.now() - state.serverTime;
        }
        setGameState(state);
        setActionError('');
        // Combine badges and completed challenges into one celebration list
        const celebrations = [];
        if (state.newBadges && state.newBadges.length > 0) {
          celebrations.push(...state.newBadges);
        }
        if (state.completedChallenges && state.completedChallenges.length > 0) {
          celebrations.push(...state.completedChallenges.map(c => ({
            ...c, isChallenge: true,
          })));
        }
        if (celebrations.length > 0) {
          setNewBadges(celebrations);
        }
      };

      // If game just ended, skip all staging — apply immediately to avoid stale state
      if (state.phase === 'ended') {
        applyState();
        animBusyUntil.current = 0; // clear any pending animation lock
        return;
      }

      // Staged animation: bank update (chip pop) happens separately from full state
      const chipPopDuration = 800; // time for pop animation to play

      if (animationDelay > 0 && bankChanged) {
        // Card animation first, then bank pop, then full state
        // Also carry timer data in Stage 1 so clock doesn't show stale values
        setTimeout(() => {
          setGameState(prev => prev ? {
            ...prev, bank: state.bank,
            timers: state.timers, turnStartedAt: state.turnStartedAt, serverTime: state.serverTime,
          } : state);
          if (state.serverTime) serverOffset.current = Date.now() - state.serverTime;
        }, animationDelay);
        setTimeout(applyState, animationDelay + chipPopDuration);
      } else if (bankChanged) {
        // No card animation but bank changed (chip takes) — show pop then apply full state
        setGameState(prev => prev ? {
          ...prev, bank: state.bank,
          timers: state.timers, turnStartedAt: state.turnStartedAt, serverTime: state.serverTime,
        } : state);
        if (state.serverTime) serverOffset.current = Date.now() - state.serverTime;
        setTimeout(applyState, chipPopDuration);
      } else if (animationDelay > 0) {
        setTimeout(applyState, animationDelay);
      } else {
        applyState();
      }

      const chipPopDelay = bankChanged ? chipPopDuration : 0;
      // Mark when animations will be done (+ 500ms buffer between turns)
      animBusyUntil.current = Date.now() + animationDelay + chipPopDelay + 500;

      // After all animations done, check for queued states
      const totalDelay = animationDelay + chipPopDelay;
      if (totalDelay > 0) {
        setTimeout(drainQueue, totalDelay + 500);
      }
    }

    function drainQueue() {
      if (pendingStates.current.length > 0) {
        const next = pendingStates.current.shift();
        processGameState(next);
      }
    }

    socket.on('gameState', (state) => {
      // Game-ending states should NEVER be queued — apply immediately
      if (state.phase === 'ended') {
        pendingStates.current = [];
        animBusyUntil.current = 0;
        processGameState(state);
        return;
      }
      const now = Date.now();
      if (now < animBusyUntil.current) {
        // Animations still playing — queue this state (keep only latest)
        pendingStates.current = [state];
        // Schedule drain for when current animations finish
        const waitTime = animBusyUntil.current - now + 100;
        setTimeout(drainQueue, waitTime);
      } else {
        processGameState(state);
      }
    });
    socket.on('gameNotFound', () => {
      // Game was cleaned up — go back to lobby
      onLeave();
    });
    socket.on('needsReturn', ({ currentChips }) => {
      if (skipNextNeedsReturn.current) {
        skipNextNeedsReturn.current = false;
        return;
      }
      setReturnChipsData(currentChips);
      setShowReturn(true);
    });
    socket.on('actionError', ({ message }) => {
      setActionError(message);
      // Force-drain any queued state so client catches up with server
      if (pendingStates.current.length > 0) {
        animBusyUntil.current = 0;
        drainQueue();
      }
    });
    socket.on('playerPassed', ({ playerName }) => {
      setPassAlert({ playerName });
      setTimeout(() => setPassAlert(null), 2000);
    });

    return () => {
      socket.off('gameState');
      socket.off('gameNotFound');
      socket.off('needsReturn');
      socket.off('actionError');
      socket.off('playerPassed');
    };
  }, [socket, userId, isSpectating, gameId, onLeave, animateCardFly, animateNobleClaim]);

  // Chess clock tick — update `now` every second for live countdown
  useEffect(() => {
    if (!gameState?.timeControl || gameState.phase === 'ended') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [gameState?.timeControl, gameState?.phase]);

  if (!gameState) return <div className="loading">Loading game...</div>;

  // Calculate live timer values — `now` state updates every second to drive countdown
  function getPlayerTime(playerIndex) {
    if (!gameState.timers || gameState.timers[playerIndex] == null) return null;
    let remaining = gameState.timers[playerIndex];
    // If this player's turn is active, subtract elapsed time since turnStartedAt
    // Use serverOffset to convert server's turnStartedAt to client time
    if (playerIndex === gameState.currentPlayerIndex && gameState.turnStartedAt && gameState.phase !== 'ended') {
      const serverTurnStart = gameState.turnStartedAt + serverOffset.current;
      const elapsed = now - serverTurnStart;
      remaining = Math.max(0, remaining - elapsed);
    }
    return remaining;
  }

  function formatTime(ms) {
    if (ms === null || ms === undefined) return '';
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

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

    // Reserving gives a gold chip — check if that would exceed 10
    const currentTotal = me ? Object.values(me.chips).reduce((s, v) => s + v, 0) : 0;
    if (currentTotal + 1 > 10) {
      const projectedChips = { ...me.chips, gold: (me.chips.gold || 0) + 1 };
      setPendingAction({ type: 'reserveCard', data: { cardId, fromDeck } });
      setReturnChipsData(projectedChips);
      setShowReturn(true);
    } else {
      socket.emit('reserveCard', { gameId, cardId, fromDeck });
    }
  }

  function handleTakeChips(chips) {
    if (!isMyTurn || gemAnimating) return;
    setGemAnimating(true);

    // Build gem list from selection
    const gemList = [];
    for (const [color, count] of Object.entries(chips)) {
      for (let i = 0; i < count; i++) {
        gemList.push(color);
      }
    }

    // Phase 1: Show gems at screen center
    setGemPopup(gemList);

    // Phase 2: After hold, fly gems to player panel
    setTimeout(() => {
      setGemPopup(null);

      const targetEl = document.querySelector('.player-panel.is-me .player-gem-columns');
      const targetRect = targetEl
        ? targetEl.getBoundingClientRect()
        : { left: window.innerWidth * 0.08, top: window.innerHeight * 0.15, width: 100, height: 30 };
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const spacing = 80;
      const startOffset = -((gemList.length - 1) * spacing) / 2;

      const newFlying = gemList.map((color, i) => ({
        id: `gem_${color}_${i}_${Date.now()}`,
        color,
        startX: cx + startOffset + i * spacing,
        startY: cy,
        endX: targetX,
        endY: targetY,
      }));

      setFlyingGems(newFlying);

      // Remove after fly animation
      setTimeout(() => setFlyingGems([]), 1100);

      // Send action & reset after fly completes
      setTimeout(() => {
        setGemAnimating(false);

        // Check if taking these chips would exceed 10
        const currentTotal = me ? Object.values(me.chips).reduce((s, v) => s + v, 0) : 0;
        const takingTotal = Object.values(chips).reduce((s, v) => s + v, 0);

        if (currentTotal + takingTotal > 10) {
          // Show return modal BEFORE sending to server
          const projectedChips = { ...me.chips };
          for (const [color, count] of Object.entries(chips)) {
            projectedChips[color] = (projectedChips[color] || 0) + count;
          }
          setPendingAction({ type: 'takeChips', data: { chips } });
          setReturnChipsData(projectedChips);
          setShowReturn(true);
        } else {
          socket.emit('takeChips', { gameId, chips });
          // Safety: if server doesn't respond in 8s, reset animating state
          setTimeout(() => setGemAnimating(false), 8000);
        }
      }, 1200);
    }, 900);
  }

  function handleReturn(chipsToReturn) {
    if (pendingAction) {
      // Emit the original action first, then return chips
      skipNextNeedsReturn.current = true;
      if (pendingAction.type === 'takeChips') {
        socket.emit('takeChips', { gameId, chips: pendingAction.data.chips });
      } else if (pendingAction.type === 'reserveCard') {
        socket.emit('reserveCard', { gameId, ...pendingAction.data });
      }
      socket.emit('returnChips', { gameId, chips: chipsToReturn });
      setPendingAction(null);
    } else {
      socket.emit('returnChips', { gameId, chips: chipsToReturn });
    }
    setShowReturn(false);
    setReturnChipsData(null);
  }

  function handlePass() {
    if (!isMyTurn) return;
    socket.emit('passTurn', { gameId });
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

      {passAlert && (
        <div className="pass-alert-overlay">
          <div className="pass-alert">
            <span className="pass-alert-icon">&#x26D4;</span>
            <span>{passAlert.playerName} passed their turn!</span>
          </div>
        </div>
      )}

      {gameState.phase === 'ended' && (
        <VictoryScreen
          gameState={gameState}
          userId={userId}
          isSpectating={isSpectating}
          onLeave={onLeave}
        />
      )}

      {actionError && (
        <div className="error-popup-overlay" onClick={() => setActionError('')}>
          <div className="error-popup" onClick={e => e.stopPropagation()}>
            <p>{actionError}</p>
            <button className="btn-primary" onClick={() => setActionError('')}>OK</button>
          </div>
        </div>
      )}

      <div className="game-layout">
        {/* Left: Players */}
        <div className="players-sidebar">
          {gameState.players.map((p, idx) => {
            const timeMs = getPlayerTime(idx);
            return (
              <div key={p.id} data-player-id={p.id}>
                <PlayerPanel
                  player={p}
                  isCurrentTurn={p.id === gameState.currentPlayerId}
                  isMe={p.id === userId}
                />
                {gameState.timeControl && timeMs != null && (
                  <div className={`chess-clock ${p.id === gameState.currentPlayerId && gameState.phase !== 'ended' ? 'clock-active' : ''} ${timeMs > 0 && timeMs <= 30000 ? 'clock-danger' : timeMs > 0 && timeMs <= 60000 ? 'clock-warning' : ''}`}>
                    <span className="clock-icon">{timeMs <= 30000 ? '🔴' : timeMs <= 60000 ? '🟡' : '⏱'}</span>
                    <span className="clock-time">{formatTime(timeMs)}</span>
                  </div>
                )}
              </div>
            );
          })}
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
                    if (!cc) return null;
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
              {gameState.board[level].map(card => {
                const isHidden = hiddenBoardCards.has(card.id);
                const isHighlighted = highlightCards.some(h => h.id === card.id);
                const highlightColor = highlightCards.find(h => h.id === card.id)?.color;
                const isNew = newBoardCards.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={`card-wrapper ${isHighlighted ? 'card-highlight' : ''} ${isNew ? 'card-appear' : ''} ${isHidden ? 'card-empty-slot' : ''}`}
                    ref={el => cardRefs.current[card.id] = el}
                    style={isHighlighted ? { '--highlight-color': CARD_GLOW[highlightColor] || 'rgba(212,175,55,0.4)' } : undefined}
                  >
                    {!isHidden && (
                      <Card
                        card={card}
                        onClick={() => isMyTurn && setSelectedCard(card)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Chip Bank */}
          <ChipBank bank={gameState.bank} onTakeChips={handleTakeChips} isMyTurn={isMyTurn} animating={gemAnimating} />
        </div>

        {/* Right: My reserved cards + game log */}
        <div className="right-sidebar">
          {me && (
            <div className="my-reserved">
              <h3 onClick={() => setShowReserved(!showReserved)} style={{ cursor: 'pointer' }}>
                My Reserved ({me.reserved?.length || 0}/3) {showReserved ? '▼' : '▶'}
              </h3>
              <div className={showReserved ? 'reserved-cards-list' : 'reserved-cards-list reserved-collapsed'}>
                {me.reserved?.map(card => (
                  <div key={card.id} className="card-wrapper" ref={el => reservedRefs.current[card.id] = el}>
                    <Card card={card} small />
                    {isMyTurn && canAffordCard(card) && (
                      <button className="btn-buy btn-sm" onClick={() => handlePurchase(card.id)}>Buy</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="game-log">
            <h3>Game Log</h3>
            {gameState.log.map((msg, i) => (
              <p key={i} className="log-entry">{msg}</p>
            ))}
          </div>

          <div className="turn-indicator">
            {gameState.phase === 'ended'
              ? `Game Over! ${gameState.players.find(p => p.id === gameState.winner)?.name || 'Nobody'} wins!`
              : isSpectating
                ? `${gameState.players[gameState.currentPlayerIndex]?.name}'s turn`
                : isMyTurn ? "🟢 Your turn!" : `Waiting for ${gameState.players[gameState.currentPlayerIndex]?.name}...`}
            {gameState.timeControl && isMyTurn && gameState.phase !== 'ended' && getPlayerTime(gameState.currentPlayerIndex) != null && (
              <span className={`turn-timer ${(getPlayerTime(gameState.currentPlayerIndex) || 0) <= 30000 ? 'timer-danger' : ''}`}>
                {formatTime(getPlayerTime(gameState.currentPlayerIndex))}
              </span>
            )}
          </div>

          {isMyTurn && gameActive && (
            <button className="btn-pass" onClick={handlePass}>
              Pass Turn
            </button>
          )}

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
        <ReturnChipsModal
          currentChips={returnChips}
          onReturn={handleReturn}
          onCancel={pendingAction ? () => {
            setPendingAction(null);
            setShowReturn(false);
            setReturnChipsData(null);
          } : undefined}
        />
      )}

      {showResign && (
        <ResignModal onConfirm={confirmResign} onCancel={() => setShowResign(false)} />
      )}

      {newBadges && (
        <BadgeNotification badges={newBadges} onDone={() => setNewBadges(null)} />
      )}

      {/* Card popup — zooms from board position to screen center */}
      {popupCard && (
        <div className="card-popup-overlay">
          <div
            className="card-popup"
            style={{
              '--origin-x': `${popupCard.startX}px`,
              '--origin-y': `${popupCard.startY}px`,
              '--card-glow': popupCard.glow,
            }}
          >
            <Card card={popupCard.cardData} />
          </div>
        </div>
      )}

      {/* Gem popup — selected gems appear at screen center */}
      {gemPopup && gemPopup.length > 0 && (
        <div className="gem-popup-overlay">
          <div className="gem-popup-row">
            {gemPopup.map((color, i) => {
              const gs = GEM_STYLES[color];
              return (
                <div
                  key={`${color}_${i}`}
                  className="gem-popup-chip"
                  style={{
                    background: gs.bg,
                    border: gs.border,
                    boxShadow: `0 0 30px ${gs.glow}, 0 8px 24px rgba(0,0,0,0.4)`,
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <span style={{ color: gs.color, fontWeight: 700, fontSize: '1.1rem' }}>
                    +1
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Flying gems — from center to player panel */}
      {flyingGems.map(gem => {
        const gs = GEM_STYLES[gem.color];
        return (
          <div
            key={gem.id}
            className="flying-chip"
            style={{
              '--start-x': `${gem.startX}px`,
              '--start-y': `${gem.startY}px`,
              '--end-x': `${gem.endX}px`,
              '--end-y': `${gem.endY}px`,
              background: gs.bg,
              border: `2px solid ${gs.glow}`,
            }}
          />
        );
      })}

      {/* Flying gems — from player panel to chip bank (card purchase chip return) */}
      {returnFlyingGems.map(gem => {
        const gs = GEM_STYLES[gem.color];
        return (
          <div
            key={gem.id}
            className="flying-chip return-flying-gem"
            style={{
              '--start-x': `${gem.startX}px`,
              '--start-y': `${gem.startY}px`,
              '--end-x': `${gem.endX}px`,
              '--end-y': `${gem.endY}px`,
              background: gs.bg,
              border: `2px solid ${gs.glow}`,
            }}
          >
            <span className="return-gem-count" style={{ color: gs.color }}>{gem.count}</span>
          </div>
        );
      })}

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
            ...(NOBLE_FLY_STYLE[theme] || NOBLE_FLY_STYLE.dark),
            borderRadius: '14px',
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
