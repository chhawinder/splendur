const { canAfford, getDiscounts, COLORS } = require('./gameEngine');

function cpuTurn(game, cpuPlayerId) {
  const player = game.players.find(p => p.id === cpuPlayerId);
  if (!player) return null;

  // Strategy: try to buy the highest-point card we can afford
  const allBoardCards = [
    ...game.board.level3,
    ...game.board.level2,
    ...game.board.level1,
  ];

  // 1. Try to purchase (prioritize high points)
  const affordableCards = [...allBoardCards, ...player.reserved]
    .filter(c => canAfford(c, player.chips, player.cards))
    .sort((a, b) => b.points - a.points);

  if (affordableCards.length > 0) {
    return { action: 'purchase', cardId: affordableCards[0].id };
  }

  // 2. Find the card we're closest to affording and take chips for it
  let bestCard = null;
  let bestDeficit = Infinity;

  for (const card of allBoardCards) {
    const discounts = getDiscounts(player.cards);
    let deficit = 0;
    for (const color of COLORS) {
      const cost = card.cost[color] || 0;
      const disc = discounts[color] || 0;
      const effective = Math.max(0, cost - disc);
      const need = Math.max(0, effective - (player.chips[color] || 0));
      deficit += need;
    }
    if (deficit < bestDeficit) {
      bestDeficit = deficit;
      bestCard = card;
    }
  }

  // Take chips that help us afford bestCard
  if (bestCard) {
    const discounts = getDiscounts(player.cards);
    const needed = [];
    for (const color of COLORS) {
      const cost = bestCard.cost[color] || 0;
      const disc = discounts[color] || 0;
      const effective = Math.max(0, cost - disc);
      const need = Math.max(0, effective - (player.chips[color] || 0));
      if (need > 0 && game.bank[color] > 0) {
        needed.push({ color, need });
      }
    }

    // Try take 2 of same color if possible
    for (const { color } of needed) {
      if (game.bank[color] >= 4) {
        return { action: 'takeChips', chips: { [color]: 2 } };
      }
    }

    // Take 3 different colors
    const toTake = {};
    let count = 0;
    for (const { color } of needed) {
      if (count >= 3) break;
      if (game.bank[color] > 0) {
        toTake[color] = 1;
        count++;
      }
    }
    // Fill remaining with any available color
    if (count < 3) {
      for (const color of COLORS) {
        if (count >= 3) break;
        if (!toTake[color] && game.bank[color] > 0) {
          toTake[color] = 1;
          count++;
        }
      }
    }
    if (count > 0) {
      return { action: 'takeChips', chips: toTake };
    }
  }

  // 3. Reserve a high-value card
  if (player.reserved.length < 3 && allBoardCards.length > 0) {
    const best = allBoardCards.sort((a, b) => b.points - a.points)[0];
    return { action: 'reserve', cardId: best.id };
  }

  // Fallback: take any available chips
  const toTake = {};
  let count = 0;
  for (const color of COLORS) {
    if (count >= 3) break;
    if (game.bank[color] > 0) {
      toTake[color] = 1;
      count++;
    }
  }
  if (count > 0) return { action: 'takeChips', chips: toTake };

  return { action: 'pass' };
}

module.exports = { cpuTurn };
