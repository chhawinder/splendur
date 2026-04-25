const { LEVEL1_CARDS, LEVEL2_CARDS, LEVEL3_CARDS, BONUS_TILES } = require('./gameData');
const { v4: uuidv4 } = require('uuid');

const COLORS = ['black', 'white', 'blue', 'green', 'red'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyChips() {
  return { black: 0, white: 0, blue: 0, green: 0, red: 0, gold: 0 };
}

function totalChips(chips) {
  return Object.values(chips).reduce((s, v) => s + v, 0);
}

function getDiscounts(cards) {
  const d = { black: 0, white: 0, blue: 0, green: 0, red: 0 };
  for (const c of cards) {
    d[c.discount] = (d[c.discount] || 0) + 1;
  }
  return d;
}

function canAfford(card, playerChips, playerCards) {
  const discounts = getDiscounts(playerCards);
  let goldNeeded = 0;
  for (const color of COLORS) {
    const cost = card.cost[color] || 0;
    const discount = discounts[color] || 0;
    const effective = Math.max(0, cost - discount);
    const deficit = Math.max(0, effective - (playerChips[color] || 0));
    goldNeeded += deficit;
  }
  return goldNeeded <= (playerChips.gold || 0);
}

function computePayment(card, playerChips, playerCards) {
  const discounts = getDiscounts(playerCards);
  const payment = emptyChips();
  let goldUsed = 0;
  for (const color of COLORS) {
    const cost = card.cost[color] || 0;
    const discount = discounts[color] || 0;
    const effective = Math.max(0, cost - discount);
    const fromChips = Math.min(effective, playerChips[color] || 0);
    payment[color] = fromChips;
    goldUsed += effective - fromChips;
  }
  payment.gold = goldUsed;
  return payment;
}

function createGame(playerIds, playerNames) {
  const numPlayers = playerIds.length;

  // Chip counts based on player count
  let regularChipCount;
  if (numPlayers === 2) regularChipCount = 4;
  else if (numPlayers === 3) regularChipCount = 5;
  else regularChipCount = 7;

  const bank = { gold: 5 };
  for (const c of COLORS) bank[c] = regularChipCount;

  // Bonus tiles
  let numTiles;
  if (numPlayers === 2) numTiles = 3;
  else if (numPlayers === 3) numTiles = 4;
  else numTiles = 5;

  const shuffledTiles = shuffle(BONUS_TILES);
  const bonusTiles = shuffledTiles.slice(0, numTiles).map((t, i) => ({
    ...t, id: `tile_${i}`, claimed: false, claimedBy: null
  }));

  // Card decks
  const deck1 = shuffle(LEVEL1_CARDS).map((c, i) => ({ ...c, id: `l1_${i}`, level: 1 }));
  const deck2 = shuffle(LEVEL2_CARDS).map((c, i) => ({ ...c, id: `l2_${i}`, level: 2 }));
  const deck3 = shuffle(LEVEL3_CARDS).map((c, i) => ({ ...c, id: `l3_${i}`, level: 3 }));

  const board = {
    level1: deck1.splice(0, 4),
    level2: deck2.splice(0, 4),
    level3: deck3.splice(0, 4),
  };

  const players = playerIds.map((id, i) => ({
    id,
    name: playerNames[i],
    chips: emptyChips(),
    cards: [],
    reserved: [],
    bonusTiles: [],
    points: 0,
  }));

  return {
    id: uuidv4(),
    players,
    bank,
    board,
    decks: { level1: deck1, level2: deck2, level3: deck3 },
    bonusTiles,
    currentPlayerIndex: 0,
    turnNumber: 0,
    round: 0,
    phase: 'playing', // playing, lastRound, ended
    lastRoundTriggeredBy: null,
    winner: null,
    log: [],
  };
}

function takeChips(game, playerId, chipSelection) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (game.players[game.currentPlayerIndex].id !== playerId) return { error: 'Not your turn' };
  if (game.phase === 'ended') return { error: 'Game has ended' };

  const colors = Object.keys(chipSelection).filter(c => c !== 'gold' && chipSelection[c] > 0);
  const totalTaking = Object.values(chipSelection).reduce((s, v) => s + v, 0);

  // Validate: take 3 different colors or 2 same color
  if (totalTaking === 3) {
    if (colors.length !== 3) return { error: 'Must take 3 chips of different colors' };
    for (const c of colors) {
      if (chipSelection[c] !== 1) return { error: 'Must take exactly 1 of each color' };
      if (game.bank[c] < 1) return { error: `No ${c} chips available` };
    }
  } else if (totalTaking === 2) {
    if (colors.length !== 1) return { error: 'Must take 2 chips of the same color' };
    const color = colors[0];
    if (chipSelection[color] !== 2) return { error: 'Must take exactly 2' };
    if (game.bank[color] < 4) return { error: `Need at least 4 ${color} chips in bank to take 2` };
  } else {
    return { error: 'Must take 2 or 3 chips' };
  }

  // Apply
  for (const c of colors) {
    const amount = chipSelection[c];
    game.bank[c] -= amount;
    player.chips[c] += amount;
  }

  game.log.push(`${player.name} took chips: ${colors.map(c => `${chipSelection[c]} ${c}`).join(', ')}`);
  return { success: true, needsReturn: totalChips(player.chips) > 10 };
}

function returnChips(game, playerId, chipsToReturn) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };

  const returning = Object.values(chipsToReturn).reduce((s, v) => s + v, 0);
  const currentTotal = totalChips(player.chips);
  if (currentTotal - returning > 10) return { error: 'Must return down to 10 chips' };
  if (currentTotal - returning < 10 && currentTotal > 10) return { error: 'Returning too many chips' };

  for (const [color, amount] of Object.entries(chipsToReturn)) {
    if (amount < 0) return { error: 'Cannot return negative chips' };
    if ((player.chips[color] || 0) < amount) return { error: `Not enough ${color} chips to return` };
  }

  for (const [color, amount] of Object.entries(chipsToReturn)) {
    player.chips[color] -= amount;
    game.bank[color] += amount;
  }

  return { success: true };
}

function reserveCard(game, playerId, cardId, fromDeck) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (game.players[game.currentPlayerIndex].id !== playerId) return { error: 'Not your turn' };
  if (game.phase === 'ended') return { error: 'Game has ended' };
  if (player.reserved.length >= 3) return { error: 'Already have 3 reserved cards' };

  let card;
  if (fromDeck) {
    // Reserve top card from a face-down deck
    const level = fromDeck; // 1, 2, or 3
    const deckKey = `level${level}`;
    if (game.decks[deckKey].length === 0) return { error: 'Deck is empty' };
    card = game.decks[deckKey].shift();
  } else {
    // Reserve face-up card
    for (const level of ['level1', 'level2', 'level3']) {
      const idx = game.board[level].findIndex(c => c.id === cardId);
      if (idx !== -1) {
        card = game.board[level].splice(idx, 1)[0];
        // Refill from deck
        if (game.decks[level].length > 0) {
          game.board[level].push(game.decks[level].shift());
        }
        break;
      }
    }
    if (!card) return { error: 'Card not found on board' };
  }

  player.reserved.push(card);

  // Take gold chip if available
  if (game.bank.gold > 0) {
    game.bank.gold--;
    player.chips.gold++;
  }

  game.log.push(`${player.name} reserved a card and took a gold chip`);
  return { success: true, needsReturn: totalChips(player.chips) > 10 };
}

function purchaseCard(game, playerId, cardId) {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };
  if (game.players[game.currentPlayerIndex].id !== playerId) return { error: 'Not your turn' };
  if (game.phase === 'ended') return { error: 'Game has ended' };

  let card;
  let fromReserved = false;
  let boardLevel = null;

  // Check reserved cards first
  const resIdx = player.reserved.findIndex(c => c.id === cardId);
  if (resIdx !== -1) {
    card = player.reserved[resIdx];
    fromReserved = true;
  } else {
    // Check board
    for (const level of ['level1', 'level2', 'level3']) {
      const idx = game.board[level].findIndex(c => c.id === cardId);
      if (idx !== -1) {
        card = game.board[level][idx];
        boardLevel = level;
        break;
      }
    }
  }

  if (!card) return { error: 'Card not found' };
  if (!canAfford(card, player.chips, player.cards)) return { error: 'Cannot afford this card' };

  // Pay for the card
  const payment = computePayment(card, player.chips, player.cards);
  for (const [color, amount] of Object.entries(payment)) {
    player.chips[color] -= amount;
    game.bank[color] += amount;
  }

  // Add card to player's collection
  if (fromReserved) {
    player.reserved.splice(resIdx, 1);
  } else {
    const idx = game.board[boardLevel].findIndex(c => c.id === cardId);
    game.board[boardLevel].splice(idx, 1);
    if (game.decks[boardLevel].length > 0) {
      game.board[boardLevel].push(game.decks[boardLevel].shift());
    }
  }
  player.cards.push(card);
  player.points += card.points;

  game.log.push(`${player.name} purchased a ${card.discount} card for ${card.points} points`);
  return { success: true };
}

function checkBonusTiles(game, playerId) {
  const player = game.players.find(p => p.id === playerId);
  const discounts = getDiscounts(player.cards);

  for (const tile of game.bonusTiles) {
    if (tile.claimed) continue;
    let qualifies = true;
    for (const [color, count] of Object.entries(tile.condition)) {
      if ((discounts[color] || 0) < count) {
        qualifies = false;
        break;
      }
    }
    if (qualifies) {
      tile.claimed = true;
      tile.claimedBy = playerId;
      player.bonusTiles.push(tile);
      player.points += tile.points;
      game.log.push(`${player.name} claimed a bonus tile for ${tile.points} points!`);
      return tile; // Only one per turn
    }
  }
  return null;
}

function endTurn(game) {
  const currentPlayer = game.players[game.currentPlayerIndex];

  // Check bonus tiles
  checkBonusTiles(game, currentPlayer.id);

  // Check if game should end
  if (currentPlayer.points >= 15 && game.phase === 'playing') {
    game.phase = 'lastRound';
    game.lastRoundTriggeredBy = game.currentPlayerIndex;
    game.log.push(`${currentPlayer.name} reached 15 points! Final round begins.`);
  }

  // Move to next non-resigned player
  const numPlayers = game.players.length;
  for (let i = 0; i < numPlayers; i++) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % numPlayers;
    if (!game.players[game.currentPlayerIndex].resigned) break;
  }
  game.turnNumber++;

  // Check if last round is complete (back to first player or past trigger point)
  if (game.phase === 'lastRound' && game.currentPlayerIndex === 0) {
    game.phase = 'ended';
    // Determine winner among non-resigned players
    const activePlayers = game.players.filter(p => !p.resigned);
    let maxPoints = -1;
    let winner = null;
    for (const p of activePlayers) {
      if (p.points > maxPoints || (p.points === maxPoints && (!winner || p.cards.length < winner.cards.length))) {
        maxPoints = p.points;
        winner = p;
      }
    }
    if (winner) {
      game.winner = winner.id;
      game.log.push(`Game over! ${winner.name} wins with ${winner.points} points!`);
    }
  }

  return game;
}

function getPublicGameState(game, forPlayerId) {
  return {
    id: game.id,
    board: game.board,
    bank: game.bank,
    bonusTiles: game.bonusTiles,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      cards: p.cards,
      reservedCount: p.reserved.length,
      reserved: p.id === forPlayerId ? p.reserved : p.reserved.map(c => ({ id: c.id, hidden: true })),
      bonusTiles: p.bonusTiles,
      points: p.points,
      resigned: p.resigned || false,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerId: game.players[game.currentPlayerIndex].id,
    turnNumber: game.turnNumber,
    phase: game.phase,
    winner: game.winner,
    log: game.log.slice(-10),
    deckCounts: {
      level1: game.decks.level1.length,
      level2: game.decks.level2.length,
      level3: game.decks.level3.length,
    },
  };
}

module.exports = {
  createGame,
  takeChips,
  returnChips,
  reserveCard,
  purchaseCard,
  endTurn,
  getPublicGameState,
  canAfford,
  getDiscounts,
  COLORS,
};
