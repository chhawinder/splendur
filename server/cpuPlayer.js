const { canAfford, getDiscounts, COLORS } = require('./gameEngine');

function cpuTurn(game, cpuPlayerId) {
  const player = game.players.find(p => p.id === cpuPlayerId);
  if (!player) return null;

  const allBoardCards = [
    ...game.board.level3,
    ...game.board.level2,
    ...game.board.level1,
  ];

  const myDiscounts = getDiscounts(player.cards);
  const opponents = game.players.filter(p => p.id !== cpuPlayerId && !p.resigned);

  // ============ SCORING HELPERS ============

  // How many chips a player still needs to buy a card (lower = closer)
  function cardDeficit(card, chips, cards) {
    const disc = getDiscounts(cards);
    let total = 0;
    for (const color of COLORS) {
      const cost = card.cost?.[color] || 0;
      const d = disc[color] || 0;
      const effective = Math.max(0, cost - d);
      const need = Math.max(0, effective - (chips[color] || 0));
      total += need;
    }
    return total;
  }

  // Score a card: points + bonus tile progress + discount value
  function scoreCard(card) {
    let score = card.points * 3; // points are very valuable

    // Bonus: does this card's discount help us toward any unclaimed bonus tile?
    for (const tile of game.bonusTiles) {
      if (tile.claimed) continue;
      const needed = (tile.condition[card.discount] || 0) - (myDiscounts[card.discount] || 0);
      if (needed > 0) {
        score += tile.points * 1.5; // weighted bonus tile value
      }
    }

    // Bonus: how close are we to this card already? Easier cards scored higher
    const deficit = cardDeficit(card, player.chips, player.cards);
    score += Math.max(0, 5 - deficit); // up to 5 bonus for easy-to-buy cards

    return score;
  }

  // Check what opponents are close to buying
  function getOpponentTargets() {
    const targets = [];
    for (const opp of opponents) {
      for (const card of allBoardCards) {
        const def = cardDeficit(card, opp.chips, opp.cards);
        if (def <= 2 && card.points >= 2) {
          targets.push({ card, opponent: opp, deficit: def });
        }
      }
    }
    return targets.sort((a, b) => a.deficit - b.deficit);
  }

  // Check if we're close to any bonus tile
  function getBonusTileProgress() {
    const results = [];
    for (const tile of game.bonusTiles) {
      if (tile.claimed) continue;
      let missing = 0;
      const neededColors = [];
      for (const [color, count] of Object.entries(tile.condition)) {
        const have = myDiscounts[color] || 0;
        if (have < count) {
          missing += count - have;
          neededColors.push(color);
        }
      }
      results.push({ tile, missing, neededColors });
    }
    return results.sort((a, b) => a.missing - b.missing);
  }

  // ============ STRATEGY ============

  // 1. BUY: Purchase the best affordable card
  const affordableCards = [...allBoardCards, ...player.reserved]
    .filter(c => canAfford(c, player.chips, player.cards));

  if (affordableCards.length > 0) {
    // Score each affordable card and pick the best
    const scored = affordableCards.map(c => ({ card: c, score: scoreCard(c) }));
    scored.sort((a, b) => b.score - a.score);
    return { action: 'purchase', cardId: scored[0].card.id };
  }

  // 2. BLOCK: If an opponent is 1-2 chips away from a high-value card, consider blocking
  const opponentTargets = getOpponentTargets();
  if (opponentTargets.length > 0) {
    const topThreat = opponentTargets[0];

    // Can we buy the card they want?
    if (canAfford(topThreat.card, player.chips, player.cards)) {
      return { action: 'purchase', cardId: topThreat.card.id };
    }

    // Should we reserve it to block them? (30% chance for some unpredictability)
    if (player.reserved.length < 3 && topThreat.card.points >= 3 && Math.random() < 0.3) {
      return { action: 'reserve', cardId: topThreat.card.id };
    }
  }

  // 3. BONUS TILE PURSUIT: Prioritize cards that get us closer to unclaimed bonus tiles
  const tileProgress = getBonusTileProgress();
  if (tileProgress.length > 0 && tileProgress[0].missing <= 3) {
    const targetTile = tileProgress[0];
    // Find board cards whose discount matches what we need for the tile
    const helpfulCards = allBoardCards
      .filter(c => targetTile.neededColors.includes(c.discount))
      .map(c => ({ card: c, deficit: cardDeficit(c, player.chips, player.cards) }))
      .sort((a, b) => a.deficit - b.deficit);

    if (helpfulCards.length > 0) {
      const closest = helpfulCards[0];
      // If we can almost afford it, take chips toward it
      if (closest.deficit <= 3) {
        const chips = getChipsToward(closest.card);
        if (chips) return chips;
      }
      // Reserve it if deficit is small and we have room
      if (closest.deficit <= 2 && player.reserved.length < 3 && Math.random() < 0.4) {
        return { action: 'reserve', cardId: closest.card.id };
      }
    }
  }

  // 4. OPTIMAL CARD TARGET: Find best card to work toward
  const cardTargets = allBoardCards
    .map(c => ({
      card: c,
      deficit: cardDeficit(c, player.chips, player.cards),
      score: scoreCard(c),
    }))
    .filter(c => c.deficit > 0)
    .sort((a, b) => {
      // Balance between score and achievability
      const aVal = a.score / (a.deficit + 1);
      const bVal = b.score / (b.deficit + 1);
      return bVal - aVal;
    });

  if (cardTargets.length > 0) {
    const target = cardTargets[0];
    const chips = getChipsToward(target.card);
    if (chips) return chips;
  }

  // 5. RESERVE: Reserve a high-value card (especially Level 3) for later + get gold
  if (player.reserved.length < 3) {
    // Prefer cards with high score that we're somewhat close to
    const reserveCandidates = allBoardCards
      .filter(c => c.points >= 2)
      .map(c => ({ card: c, score: scoreCard(c), deficit: cardDeficit(c, player.chips, player.cards) }))
      .sort((a, b) => b.score - a.score);

    if (reserveCandidates.length > 0) {
      return { action: 'reserve', cardId: reserveCandidates[0].card.id };
    }
    // Reserve anything
    if (allBoardCards.length > 0) {
      const best = [...allBoardCards].sort((a, b) => b.points - a.points)[0];
      return { action: 'reserve', cardId: best.id };
    }
  }

  // 6. FALLBACK: Take any available chips
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

  // ============ CHIP SELECTION HELPER ============
  function getChipsToward(card) {
    const discounts = getDiscounts(player.cards);
    const needed = [];
    for (const color of COLORS) {
      const cost = card.cost?.[color] || 0;
      const disc = discounts[color] || 0;
      const effective = Math.max(0, cost - disc);
      const need = Math.max(0, effective - (player.chips[color] || 0));
      if (need > 0 && game.bank[color] > 0) {
        needed.push({ color, need, available: game.bank[color] });
      }
    }

    if (needed.length === 0) return null;

    // Try take 2 of same color if high need and bank has 4+
    const highNeed = needed.filter(n => n.need >= 2 && n.available >= 4);
    if (highNeed.length > 0) {
      return { action: 'takeChips', chips: { [highNeed[0].color]: 2 } };
    }

    // Take up to 3 different colors we need
    const toTake = {};
    let count = 0;
    for (const { color } of needed) {
      if (count >= 3) break;
      if (game.bank[color] > 0) {
        toTake[color] = 1;
        count++;
      }
    }
    // Fill remaining slots with colors useful for bonus tiles or other cards
    if (count < 3) {
      const tileColors = new Set();
      for (const tile of game.bonusTiles) {
        if (tile.claimed) continue;
        for (const [color, req] of Object.entries(tile.condition)) {
          if ((myDiscounts[color] || 0) < req) tileColors.add(color);
        }
      }
      for (const color of COLORS) {
        if (count >= 3) break;
        if (!toTake[color] && game.bank[color] > 0) {
          toTake[color] = 1;
          count++;
        }
      }
    }

    if (count > 0) return { action: 'takeChips', chips: toTake };
    return null;
  }
}

module.exports = { cpuTurn };
