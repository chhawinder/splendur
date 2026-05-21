const { createGame, takeChips, returnChips, reserveCard, purchaseCard, endTurn, getPublicGameState, canAfford, getDiscounts, COLORS } = require('../gameEngine');

// Helper: create a standard 2-player game
function makeGame(opts = {}) {
  const game = createGame(
    opts.playerIds || ['p1', 'p2'],
    opts.playerNames || ['Alice', 'Bob'],
    opts.targetScore || 15,
    opts.timeControl || null
  );
  // Fix turn order for predictable tests
  game.players = game.players.sort((a, b) => a.id.localeCompare(b.id));
  game.currentPlayerIndex = 0;
  return game;
}

function make4pGame() {
  const game = createGame(['p1', 'p2', 'p3', 'p4'], ['Alice', 'Bob', 'Carol', 'Dave'], 15, null);
  game.players = game.players.sort((a, b) => a.id.localeCompare(b.id));
  game.currentPlayerIndex = 0;
  return game;
}

// Helper: give a player specific chips
function setChips(player, chips) {
  player.chips = { black: 0, white: 0, blue: 0, green: 0, red: 0, gold: 0, ...chips };
}

// Helper: give a player a card
function giveCard(player, card) {
  player.cards.push(card);
  player.points += card.points;
}

describe('createGame', () => {
  test('creates a 2-player game with correct chip counts', () => {
    const game = makeGame();
    expect(game.players).toHaveLength(2);
    expect(game.bank.gold).toBe(5);
    for (const c of COLORS) {
      expect(game.bank[c]).toBe(4); // 2-player = 4 per color
    }
    expect(game.phase).toBe('playing');
    expect(game.currentPlayerIndex).toBe(0);
  });

  test('creates a 3-player game with 5 chips per color', () => {
    const game = createGame(['a', 'b', 'c'], ['A', 'B', 'C'], 15, null);
    for (const c of COLORS) expect(game.bank[c]).toBe(5);
  });

  test('creates a 4-player game with 7 chips per color', () => {
    const game = createGame(['a', 'b', 'c', 'd'], ['A', 'B', 'C', 'D'], 15, null);
    for (const c of COLORS) expect(game.bank[c]).toBe(7);
  });

  test('sets up timers when timeControl is provided', () => {
    const game = makeGame({ timeControl: 300000 });
    expect(game.timers).toEqual([300000, 300000]);
    expect(game.timeControl).toBe(300000);
    expect(game.turnStartedAt).toBeTruthy();
  });

  test('no timers when timeControl is null', () => {
    const game = makeGame();
    expect(game.timers).toBeNull();
  });

  test('board has 4 cards per level', () => {
    const game = makeGame();
    expect(game.board.level1).toHaveLength(4);
    expect(game.board.level2).toHaveLength(4);
    expect(game.board.level3).toHaveLength(4);
  });
});

describe('takeChips', () => {
  test('take 3 different colors', () => {
    const game = makeGame();
    const result = takeChips(game, 'p1', { black: 1, white: 1, blue: 1 });
    expect(result.success).toBe(true);
    expect(game.players[0].chips.black).toBe(1);
    expect(game.players[0].chips.white).toBe(1);
    expect(game.players[0].chips.blue).toBe(1);
    expect(game.bank.black).toBe(3);
  });

  test('take 2 of same color requires 4+ in bank', () => {
    const game = makeGame();
    const result = takeChips(game, 'p1', { black: 2 });
    expect(result.success).toBe(true);
    expect(game.players[0].chips.black).toBe(2);
    expect(game.bank.black).toBe(2);
  });

  test('take 2 of same color fails if bank has < 4', () => {
    const game = makeGame();
    game.bank.black = 3;
    const result = takeChips(game, 'p1', { black: 2 });
    expect(result.error).toBeTruthy();
  });

  test('take 1 chip is allowed', () => {
    const game = makeGame();
    const result = takeChips(game, 'p1', { red: 1 });
    expect(result.success).toBe(true);
  });

  test('take 2 different colors is allowed', () => {
    const game = makeGame();
    const result = takeChips(game, 'p1', { red: 1, blue: 1 });
    expect(result.success).toBe(true);
  });

  test('cannot take on another player turn', () => {
    const game = makeGame();
    const result = takeChips(game, 'p2', { black: 1, white: 1, blue: 1 });
    expect(result.error).toBe('Not your turn');
  });

  test('cannot take from empty bank', () => {
    const game = makeGame();
    game.bank.black = 0;
    const result = takeChips(game, 'p1', { black: 1, white: 1, blue: 1 });
    expect(result.error).toBeTruthy();
  });

  test('needsReturn true when player exceeds 10 chips', () => {
    const game = makeGame();
    setChips(game.players[0], { black: 3, white: 3, blue: 3 });
    const result = takeChips(game, 'p1', { red: 1, green: 1 });
    expect(result.success).toBe(true);
    expect(result.needsReturn).toBe(true);
  });

  test('cannot take gold chips directly', () => {
    const game = makeGame();
    const result = takeChips(game, 'p1', { gold: 1 });
    expect(result.error).toBeTruthy();
  });
});

describe('returnChips', () => {
  test('return chips to bank', () => {
    const game = makeGame();
    setChips(game.players[0], { black: 4, white: 4, blue: 4 }); // 12 total
    const result = returnChips(game, 'p1', { black: 2 });
    expect(result.success).toBe(true);
    expect(game.players[0].chips.black).toBe(2);
    expect(game.bank.black).toBe(6); // 4 + 2 returned
  });

  test('cannot return more chips than owned', () => {
    const game = makeGame();
    setChips(game.players[0], { black: 1 });
    const result = returnChips(game, 'p1', { black: 2 });
    expect(result.error).toBeTruthy();
  });

  test('must return down to exactly 10', () => {
    const game = makeGame();
    setChips(game.players[0], { black: 4, white: 4, blue: 4 }); // 12
    // Return only 1 → still at 11 → error
    const result = returnChips(game, 'p1', { black: 1 });
    expect(result.error).toBeTruthy();
  });
});

describe('reserveCard', () => {
  test('reserve a face-up card and get gold', () => {
    const game = makeGame();
    const cardId = game.board.level1[0].id;
    const result = reserveCard(game, 'p1', cardId);
    expect(result.success).toBe(true);
    expect(game.players[0].reserved).toHaveLength(1);
    expect(game.players[0].chips.gold).toBe(1);
    expect(game.bank.gold).toBe(4);
  });

  test('reserve from deck', () => {
    const game = makeGame();
    const deckSize = game.decks.level2.length;
    const result = reserveCard(game, 'p1', null, 2);
    expect(result.success).toBe(true);
    expect(game.decks.level2).toHaveLength(deckSize - 1);
    expect(game.players[0].reserved).toHaveLength(1);
  });

  test('cannot reserve more than 3', () => {
    const game = makeGame();
    game.players[0].reserved = [
      { id: 'r1' }, { id: 'r2' }, { id: 'r3' }
    ];
    const result = reserveCard(game, 'p1', game.board.level1[0].id);
    expect(result.error).toBe('Already have 3 reserved cards');
  });

  test('no gold given when bank is empty', () => {
    const game = makeGame();
    game.bank.gold = 0;
    reserveCard(game, 'p1', game.board.level1[0].id);
    expect(game.players[0].chips.gold).toBe(0);
  });

  test('board refills after reserving face-up card', () => {
    const game = makeGame();
    reserveCard(game, 'p1', game.board.level1[0].id);
    expect(game.board.level1).toHaveLength(4); // refilled from deck
  });
});

describe('purchaseCard', () => {
  test('buy a free card (0 cost)', () => {
    const game = makeGame();
    // Find or create a free card on the board
    game.board.level1[0] = { id: 'free1', points: 1, discount: 'black', cost: {} };
    const result = purchaseCard(game, 'p1', 'free1');
    expect(result.success).toBe(true);
    expect(game.players[0].cards).toHaveLength(1);
    expect(game.players[0].points).toBe(1);
  });

  test('buy with exact chips', () => {
    const game = makeGame();
    game.board.level1[0] = { id: 'card1', points: 0, discount: 'blue', cost: { white: 2, black: 1 } };
    setChips(game.players[0], { white: 2, black: 1 });
    const result = purchaseCard(game, 'p1', 'card1');
    expect(result.success).toBe(true);
    expect(game.players[0].chips.white).toBe(0);
    expect(game.players[0].chips.black).toBe(0);
    // Chips returned to bank
    expect(game.bank.white).toBe(6); // 4 + 2
  });

  test('buy with discounts', () => {
    const game = makeGame();
    game.board.level1[0] = { id: 'card1', points: 2, discount: 'red', cost: { blue: 3 } };
    // Give 2 blue discounts + 1 blue chip
    giveCard(game.players[0], { id: 'd1', points: 0, discount: 'blue' });
    giveCard(game.players[0], { id: 'd2', points: 0, discount: 'blue' });
    setChips(game.players[0], { blue: 1 });
    const result = purchaseCard(game, 'p1', 'card1');
    expect(result.success).toBe(true);
    expect(game.players[0].chips.blue).toBe(0);
  });

  test('buy with gold as wildcard', () => {
    const game = makeGame();
    game.board.level1[0] = { id: 'card1', points: 0, discount: 'green', cost: { red: 2 } };
    setChips(game.players[0], { red: 1, gold: 1 });
    const result = purchaseCard(game, 'p1', 'card1');
    expect(result.success).toBe(true);
    expect(game.players[0].chips.gold).toBe(0);
    expect(game.players[0].chips.red).toBe(0);
  });

  test('cannot buy if cannot afford', () => {
    const game = makeGame();
    game.board.level1[0] = { id: 'card1', points: 5, discount: 'black', cost: { white: 7 } };
    setChips(game.players[0], { white: 2 });
    const result = purchaseCard(game, 'p1', 'card1');
    expect(result.error).toBe('Cannot afford this card');
  });

  test('buy from reserved cards', () => {
    const game = makeGame();
    const card = { id: 'res1', points: 3, discount: 'white', cost: {} };
    game.players[0].reserved = [card];
    const result = purchaseCard(game, 'p1', 'res1');
    expect(result.success).toBe(true);
    expect(game.players[0].reserved).toHaveLength(0);
    expect(game.players[0].cards).toHaveLength(1);
    expect(game.players[0].points).toBe(3);
  });

  test('board refills after buying face-up card', () => {
    const game = makeGame();
    game.board.level1[0] = { id: 'card1', points: 0, discount: 'black', cost: {} };
    purchaseCard(game, 'p1', 'card1');
    expect(game.board.level1).toHaveLength(4);
  });
});

describe('endTurn', () => {
  test('advances to next player', () => {
    const game = makeGame();
    expect(game.currentPlayerIndex).toBe(0);
    endTurn(game);
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.turnNumber).toBe(1);
  });

  test('wraps around to first player', () => {
    const game = makeGame();
    game.currentPlayerIndex = 1;
    endTurn(game);
    expect(game.currentPlayerIndex).toBe(0);
  });

  test('skips resigned players', () => {
    const game = make4pGame();
    game.players[1].resigned = true;
    game.currentPlayerIndex = 0;
    endTurn(game);
    expect(game.currentPlayerIndex).toBe(2); // skipped p2 (index 1)
  });

  test('triggers lastRound when player reaches target score', () => {
    const game = makeGame();
    game.players[0].points = 15;
    endTurn(game);
    expect(game.phase).toBe('lastRound');
    expect(game.lastRoundTriggeredBy).toBe(0);
    expect(game.lastRoundRemaining).toEqual(['p2']);
  });

  test('game ends after lastRound completes', () => {
    const game = makeGame();
    // p1 triggers lastRound
    game.players[0].points = 15;
    endTurn(game); // p1's turn ends, triggers lastRound
    expect(game.phase).toBe('lastRound');
    expect(game.currentPlayerIndex).toBe(1);

    // p2 plays their last turn
    endTurn(game); // p2's turn ends, lastRoundRemaining should be empty
    expect(game.phase).toBe('ended');
    expect(game.winner).toBe('p1'); // p1 has 15 points
  });

  test('highest score wins at end', () => {
    const game = makeGame();
    game.players[0].points = 15;
    game.players[1].points = 18;
    endTurn(game); // p1 triggers lastRound
    endTurn(game); // p2 finishes, round complete
    expect(game.phase).toBe('ended');
    expect(game.winner).toBe('p2'); // p2 has more points
  });

  test('tiebreak: fewer cards wins', () => {
    const game = makeGame();
    game.players[0].points = 15;
    game.players[0].cards = [{ id: '1' }, { id: '2' }, { id: '3' }]; // 3 cards
    game.players[1].points = 15;
    game.players[1].cards = [{ id: '4' }, { id: '5' }]; // 2 cards
    endTurn(game); // triggers lastRound
    endTurn(game); // round ends
    expect(game.winner).toBe('p2'); // fewer cards
  });
});

// ============================================================
// BUG REGRESSION: lastRound with resigned player at index 0
// This was the root cause of "game stuck forever" bug.
// Old code: checked currentPlayerIndex === 0, which never
// triggered when player 0 was resigned (advance loop skips them).
// ============================================================
describe('endTurn — lastRound with resigned players', () => {
  test('BUG FIX: game ends when player at index 0 is resigned', () => {
    const game = make4pGame();
    // p1 (index 0) resigns
    game.players[0].resigned = true;
    // p3 (index 2) triggers lastRound
    game.currentPlayerIndex = 2;
    game.players[2].points = 16;

    endTurn(game); // p3 triggers lastRound
    expect(game.phase).toBe('lastRound');
    expect(game.lastRoundRemaining).not.toContain('p1'); // resigned, excluded
    // Remaining = [p4, p2] (indices 3, 1 — skipping resigned 0)
    expect(game.lastRoundRemaining).toEqual(['p4', 'p2']);
    expect(game.currentPlayerIndex).toBe(3); // advanced to p4

    endTurn(game); // p4 plays → remaining = [p2]
    expect(game.phase).toBe('lastRound');
    expect(game.currentPlayerIndex).toBe(1); // skipped resigned p1

    endTurn(game); // p2 plays → remaining = [] → game ends
    expect(game.phase).toBe('ended');
    expect(game.winner).toBe('p3'); // highest score
  });

  test('BUG FIX: game ends when all non-trigger players resign during lastRound', () => {
    const game = makeGame();
    game.players[0].points = 15;
    endTurn(game); // p1 triggers lastRound
    expect(game.lastRoundRemaining).toEqual(['p2']);

    // p2 resigns during lastRound
    game.players[1].resigned = true;
    // Simulate removing from lastRoundRemaining (as server resign handler does)
    const idx = game.lastRoundRemaining.indexOf('p2');
    if (idx !== -1) game.lastRoundRemaining.splice(idx, 1);

    // Next endTurn should detect empty remaining and end game
    endTurn(game);
    expect(game.phase).toBe('ended');
  });

  test('BUG FIX: 4-player game — only player 0 resigned, last round works', () => {
    const game = make4pGame();
    game.players[0].resigned = true;

    // p2 (index 1) triggers lastRound
    game.currentPlayerIndex = 1;
    game.players[1].points = 17;

    endTurn(game); // p2 triggers
    expect(game.phase).toBe('lastRound');
    // Remaining: indices 2, 3, 0(skipped) = [p3, p4]
    expect(game.lastRoundRemaining).toEqual(['p3', 'p4']);

    endTurn(game); // p3 plays → remaining = [p4]
    expect(game.phase).toBe('lastRound');

    endTurn(game); // p4 plays → remaining = [] → ended
    expect(game.phase).toBe('ended');
  });

  test('BUG FIX: last player triggers, game ends after full cycle', () => {
    const game = make4pGame();
    game.players[0].resigned = true;

    // p4 (index 3) triggers lastRound
    game.currentPlayerIndex = 3;
    game.players[3].points = 20;

    endTurn(game); // p4 triggers
    expect(game.phase).toBe('lastRound');
    // Remaining: indices 0(skipped), 1, 2 = [p2, p3]
    expect(game.lastRoundRemaining).toEqual(['p2', 'p3']);

    // Advance from 3 → skip 0 (resigned) → 1
    expect(game.currentPlayerIndex).toBe(1);

    endTurn(game); // p2 plays → remaining = [p3]
    endTurn(game); // p3 plays → remaining = [] → ended
    expect(game.phase).toBe('ended');
    expect(game.winner).toBe('p4');
  });
});

describe('bonus tiles', () => {
  test('player claims bonus tile when they meet condition', () => {
    const game = makeGame();
    game.bonusTiles = [{
      id: 'tile_0',
      points: 3,
      condition: { blue: 3, green: 3 },
      claimed: false,
      claimedBy: null,
    }];
    // Give p1 enough cards for the condition
    for (let i = 0; i < 3; i++) {
      giveCard(game.players[0], { id: `b${i}`, points: 0, discount: 'blue' });
      giveCard(game.players[0], { id: `g${i}`, points: 0, discount: 'green' });
    }
    game.players[0].points = 0; // reset (giveCard added 0 each)
    endTurn(game); // checks bonus tiles
    expect(game.bonusTiles[0].claimed).toBe(true);
    expect(game.bonusTiles[0].claimedBy).toBe('p1');
    expect(game.players[0].points).toBe(3);
  });
});

describe('getPublicGameState', () => {
  test('hides other player reserved cards', () => {
    const game = makeGame();
    game.players[1].reserved = [{ id: 'secret', points: 5, discount: 'black', cost: { white: 3 } }];
    const state = getPublicGameState(game, 'p1');
    expect(state.players[1].reserved[0].hidden).toBe(true);
    expect(state.players[1].reserved[0].points).toBeUndefined();
  });

  test('shows own reserved cards', () => {
    const game = makeGame();
    game.players[0].reserved = [{ id: 'mine', points: 5, discount: 'black', cost: { white: 3 } }];
    const state = getPublicGameState(game, 'p1');
    expect(state.players[0].reserved[0].hidden).toBeUndefined();
    expect(state.players[0].reserved[0].points).toBe(5);
  });

  test('includes current player info', () => {
    const state = getPublicGameState(makeGame(), 'p1');
    expect(state.currentPlayerId).toBe('p1');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe('playing');
  });
});

describe('canAfford', () => {
  test('can afford with exact chips', () => {
    const card = { cost: { blue: 2, red: 1 } };
    const chips = { black: 0, white: 0, blue: 2, green: 0, red: 1, gold: 0 };
    expect(canAfford(card, chips, [])).toBe(true);
  });

  test('cannot afford without enough', () => {
    const card = { cost: { blue: 3 } };
    const chips = { black: 0, white: 0, blue: 1, green: 0, red: 0, gold: 0 };
    expect(canAfford(card, chips, [])).toBe(false);
  });

  test('discounts reduce cost', () => {
    const card = { cost: { blue: 3 } };
    const chips = { black: 0, white: 0, blue: 1, green: 0, red: 0, gold: 0 };
    const cards = [
      { discount: 'blue' },
      { discount: 'blue' },
    ];
    expect(canAfford(card, chips, cards)).toBe(true); // 3 - 2 discounts = 1 needed, have 1
  });

  test('gold covers deficit', () => {
    const card = { cost: { blue: 3, red: 2 } };
    const chips = { black: 0, white: 0, blue: 1, green: 0, red: 0, gold: 4 };
    expect(canAfford(card, chips, [])).toBe(true); // need 2 blue + 2 red = 4 gold
  });

  test('handles missing cost colors gracefully', () => {
    const card = { cost: { blue: 1 } }; // no black, white, green, red in cost
    const chips = { black: 0, white: 0, blue: 1, green: 0, red: 0, gold: 0 };
    expect(canAfford(card, chips, [])).toBe(true);
  });
});

describe('edge cases', () => {
  test('game with all players resigned ends', () => {
    const game = make4pGame();
    game.players[1].resigned = true;
    game.players[2].resigned = true;
    game.players[3].resigned = true;
    // Only p1 is active
    endTurn(game);
    // Advance should land back on p1 (only non-resigned)
    expect(game.currentPlayerIndex).toBe(0);
  });

  test('taking chips when bank is nearly empty', () => {
    const game = makeGame();
    game.bank = { black: 0, white: 1, blue: 0, green: 1, red: 0, gold: 0 };
    const result = takeChips(game, 'p1', { white: 1, green: 1 });
    expect(result.success).toBe(true);
  });

  test('reserve from empty deck fails', () => {
    const game = makeGame();
    game.decks.level3 = [];
    const result = reserveCard(game, 'p1', null, 3);
    expect(result.error).toBe('Deck is empty');
  });

  test('purchase card not on board fails', () => {
    const game = makeGame();
    const result = purchaseCard(game, 'p1', 'nonexistent_card');
    expect(result.error).toBe('Card not found');
  });

  test('endTurn on ended game does not crash', () => {
    const game = makeGame();
    game.phase = 'ended';
    // Should not throw
    expect(() => endTurn(game)).not.toThrow();
  });
});
