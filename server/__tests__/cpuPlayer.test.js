const { cpuTurn } = require('../cpuPlayer');
const { createGame, takeChips, purchaseCard, COLORS } = require('../gameEngine');

function makeGame() {
  const game = createGame(['human', 'cpu1'], ['Human', 'CPU 1'], 15, null);
  game.players = game.players.sort((a, b) => a.id.localeCompare(b.id));
  // cpu1 is index 0, human is index 1
  game.currentPlayerIndex = 0;
  game.cpuPlayers = ['cpu1'];
  return game;
}

describe('cpuTurn', () => {
  test('always returns a non-null decision', () => {
    const game = makeGame();
    const decision = cpuTurn(game, 'cpu1');
    expect(decision).not.toBeNull();
    expect(['purchase', 'takeChips', 'reserve', 'pass']).toContain(decision.action);
  });

  test('purchases affordable card when available', () => {
    const game = makeGame();
    const cpu = game.players.find(p => p.id === 'cpu1');
    // Place a free card on the board
    game.board.level1[0] = { id: 'free1', points: 3, discount: 'black', cost: {} };
    const decision = cpuTurn(game, 'cpu1');
    expect(decision.action).toBe('purchase');
    expect(decision.cardId).toBe('free1');
  });

  test('takes chips when nothing affordable', () => {
    const game = makeGame();
    // All cards cost something, CPU has no chips (default state)
    const decision = cpuTurn(game, 'cpu1');
    // Should take chips or reserve (not pass, since bank has chips)
    expect(['takeChips', 'reserve']).toContain(decision.action);
  });

  test('passes when bank empty and nothing affordable', () => {
    const game = makeGame();
    // Empty the bank
    for (const c of COLORS) game.bank[c] = 0;
    game.bank.gold = 0;
    // Make all board cards expensive
    for (const level of ['level1', 'level2', 'level3']) {
      for (const card of game.board[level]) {
        card.cost = { black: 7, white: 7, blue: 7, green: 7, red: 7 };
      }
    }
    // Fill reserved so can't reserve either
    const cpu = game.players.find(p => p.id === 'cpu1');
    cpu.reserved = [
      { id: 'r1', cost: { black: 99 }, points: 0, discount: 'black' },
      { id: 'r2', cost: { black: 99 }, points: 0, discount: 'white' },
      { id: 'r3', cost: { black: 99 }, points: 0, discount: 'blue' },
    ];

    const decision = cpuTurn(game, 'cpu1');
    expect(decision.action).toBe('pass');
  });

  test('does not crash with empty board', () => {
    const game = makeGame();
    game.board.level1 = [];
    game.board.level2 = [];
    game.board.level3 = [];
    const decision = cpuTurn(game, 'cpu1');
    expect(decision).not.toBeNull();
  });

  test('does not crash when all opponents resigned', () => {
    const game = makeGame();
    game.players.find(p => p.id === 'human').resigned = true;
    const decision = cpuTurn(game, 'cpu1');
    expect(decision).not.toBeNull();
  });

  test('takeChips decision has valid chip selection', () => {
    const game = makeGame();
    const decision = cpuTurn(game, 'cpu1');
    if (decision.action === 'takeChips') {
      const colors = Object.keys(decision.chips).filter(c => decision.chips[c] > 0);
      const total = Object.values(decision.chips).reduce((s, v) => s + v, 0);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(3);
      // Each color should have chips in bank
      for (const c of colors) {
        expect(game.bank[c]).toBeGreaterThanOrEqual(decision.chips[c]);
      }
    }
  });

  test('purchase decision targets an existing card', () => {
    const game = makeGame();
    // Give CPU lots of chips so it can buy something
    const cpu = game.players.find(p => p.id === 'cpu1');
    cpu.chips = { black: 7, white: 7, blue: 7, green: 7, red: 7, gold: 5 };
    const decision = cpuTurn(game, 'cpu1');
    expect(decision.action).toBe('purchase');
    // Card should exist on board or in reserved
    const allCards = [
      ...game.board.level1, ...game.board.level2, ...game.board.level3,
      ...cpu.reserved,
    ];
    expect(allCards.some(c => c.id === decision.cardId)).toBe(true);
  });
});
