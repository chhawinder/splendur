// Splendor Card Data - Complete and Verified
// Cross-validated from multiple independent sources:
//   - yasminahobeika/Splendor_Game_Reinforcement_Learning (CSV)
//   - BogdanKocsis/Splendor-Game-C (XML database with named nobles)
//   - MortalFlame/Splendor-the-Game (JSON)
//
// 90 development cards (40 Level 1 + 30 Level 2 + 20 Level 3)
// 10 noble tiles (all worth 3 prestige points)
//
// Gem colors: white (diamond), blue (sapphire), green (emerald), red (ruby), black (onyx)

const LEVEL1_CARDS = [
  // --- Black (Onyx) cards ---
  { points: 0, discount: 'black', cost: { white: 1, blue: 1, green: 1, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 1, blue: 2, green: 1, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 2, blue: 2, red: 1 } },
  { points: 0, discount: 'black', cost: { green: 1, red: 3, black: 1 } },
  { points: 0, discount: 'black', cost: { green: 2, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 2, green: 2 } },
  { points: 0, discount: 'black', cost: { green: 3 } },
  { points: 1, discount: 'black', cost: { blue: 4 } },

  // --- Blue (Sapphire) cards ---
  { points: 0, discount: 'blue', cost: { white: 1, black: 2 } },
  { points: 0, discount: 'blue', cost: { white: 1, green: 1, red: 2, black: 1 } },
  { points: 0, discount: 'blue', cost: { white: 1, green: 1, red: 1, black: 1 } },
  { points: 0, discount: 'blue', cost: { blue: 1, green: 3, red: 1 } },
  { points: 0, discount: 'blue', cost: { black: 3 } },
  { points: 0, discount: 'blue', cost: { white: 1, green: 2, red: 2 } },
  { points: 0, discount: 'blue', cost: { green: 2, black: 2 } },
  { points: 1, discount: 'blue', cost: { red: 4 } },

  // --- Green (Emerald) cards ---
  { points: 0, discount: 'green', cost: { white: 2, blue: 1 } },
  { points: 0, discount: 'green', cost: { blue: 2, red: 2 } },
  { points: 0, discount: 'green', cost: { white: 1, blue: 3, green: 1 } },
  { points: 0, discount: 'green', cost: { white: 1, blue: 1, red: 1, black: 1 } },
  { points: 0, discount: 'green', cost: { white: 1, blue: 1, red: 1, black: 2 } },
  { points: 0, discount: 'green', cost: { blue: 1, red: 2, black: 2 } },
  { points: 0, discount: 'green', cost: { red: 3 } },
  { points: 1, discount: 'green', cost: { black: 4 } },

  // --- Red (Ruby) cards ---
  { points: 0, discount: 'red', cost: { white: 3 } },
  { points: 0, discount: 'red', cost: { white: 1, red: 1, black: 3 } },
  { points: 0, discount: 'red', cost: { blue: 2, green: 1 } },
  { points: 0, discount: 'red', cost: { white: 2, green: 1, black: 2 } },
  { points: 0, discount: 'red', cost: { white: 2, blue: 1, green: 1, black: 1 } },
  { points: 0, discount: 'red', cost: { white: 1, blue: 1, green: 1, black: 1 } },
  { points: 0, discount: 'red', cost: { white: 2, red: 2 } },
  { points: 1, discount: 'red', cost: { white: 4 } },

  // --- White (Diamond) cards ---
  { points: 0, discount: 'white', cost: { blue: 2, green: 2, black: 1 } },
  { points: 0, discount: 'white', cost: { red: 2, black: 1 } },
  { points: 0, discount: 'white', cost: { blue: 1, green: 1, red: 1, black: 1 } },
  { points: 0, discount: 'white', cost: { blue: 3 } },
  { points: 0, discount: 'white', cost: { blue: 2, black: 2 } },
  { points: 0, discount: 'white', cost: { blue: 1, green: 2, red: 1, black: 1 } },
  { points: 0, discount: 'white', cost: { white: 3, blue: 1, black: 1 } },
  { points: 1, discount: 'white', cost: { green: 4 } },
];

const LEVEL2_CARDS = [
  // --- Black (Onyx) cards ---
  { points: 1, discount: 'black', cost: { white: 3, blue: 2, green: 2 } },
  { points: 1, discount: 'black', cost: { white: 3, green: 3, black: 2 } },
  { points: 2, discount: 'black', cost: { blue: 1, green: 4, red: 2 } },
  { points: 2, discount: 'black', cost: { white: 5 } },
  { points: 2, discount: 'black', cost: { green: 5, red: 3 } },
  { points: 3, discount: 'black', cost: { black: 6 } },

  // --- Blue (Sapphire) cards ---
  { points: 1, discount: 'blue', cost: { blue: 2, green: 2, red: 3 } },
  { points: 1, discount: 'blue', cost: { blue: 2, green: 3, black: 3 } },
  { points: 2, discount: 'blue', cost: { white: 5, blue: 3 } },
  { points: 2, discount: 'blue', cost: { blue: 5 } },
  { points: 2, discount: 'blue', cost: { white: 2, red: 1, black: 4 } },
  { points: 3, discount: 'blue', cost: { blue: 6 } },

  // --- Green (Emerald) cards ---
  { points: 1, discount: 'green', cost: { white: 3, green: 2, red: 3 } },
  { points: 1, discount: 'green', cost: { white: 2, blue: 3, black: 2 } },
  { points: 2, discount: 'green', cost: { white: 4, blue: 2, black: 1 } },
  { points: 2, discount: 'green', cost: { green: 5 } },
  { points: 2, discount: 'green', cost: { blue: 5, green: 3 } },
  { points: 3, discount: 'green', cost: { green: 6 } },

  // --- Red (Ruby) cards ---
  { points: 1, discount: 'red', cost: { blue: 3, red: 2, black: 3 } },
  { points: 1, discount: 'red', cost: { white: 2, red: 2, black: 3 } },
  { points: 2, discount: 'red', cost: { white: 1, blue: 4, green: 2 } },
  { points: 2, discount: 'red', cost: { white: 3, black: 5 } },
  { points: 2, discount: 'red', cost: { black: 5 } },
  { points: 3, discount: 'red', cost: { red: 6 } },

  // --- White (Diamond) cards ---
  { points: 1, discount: 'white', cost: { green: 3, red: 2, black: 2 } },
  { points: 1, discount: 'white', cost: { white: 2, blue: 3, red: 3 } },
  { points: 2, discount: 'white', cost: { green: 1, red: 4, black: 2 } },
  { points: 2, discount: 'white', cost: { red: 5 } },
  { points: 2, discount: 'white', cost: { red: 5, black: 3 } },
  { points: 3, discount: 'white', cost: { white: 6 } },
];

const LEVEL3_CARDS = [
  // --- Black (Onyx) cards ---
  { points: 3, discount: 'black', cost: { white: 3, blue: 3, green: 5, red: 3 } },
  { points: 4, discount: 'black', cost: { red: 7 } },
  { points: 4, discount: 'black', cost: { green: 3, red: 6, black: 3 } },
  { points: 5, discount: 'black', cost: { red: 7, black: 3 } },

  // --- Blue (Sapphire) cards ---
  { points: 3, discount: 'blue', cost: { white: 3, green: 3, red: 3, black: 5 } },
  { points: 4, discount: 'blue', cost: { white: 7 } },
  { points: 4, discount: 'blue', cost: { white: 6, blue: 3, black: 3 } },
  { points: 5, discount: 'blue', cost: { white: 7, blue: 3 } },

  // --- Green (Emerald) cards ---
  { points: 3, discount: 'green', cost: { white: 5, blue: 3, red: 3, black: 3 } },
  { points: 4, discount: 'green', cost: { white: 3, blue: 6, green: 3 } },
  { points: 4, discount: 'green', cost: { blue: 7 } },
  { points: 5, discount: 'green', cost: { blue: 7, green: 3 } },

  // --- Red (Ruby) cards ---
  { points: 3, discount: 'red', cost: { white: 3, blue: 5, green: 3, black: 3 } },
  { points: 4, discount: 'red', cost: { green: 7 } },
  { points: 4, discount: 'red', cost: { blue: 3, green: 6, red: 3 } },
  { points: 5, discount: 'red', cost: { green: 7, red: 3 } },

  // --- White (Diamond) cards ---
  { points: 3, discount: 'white', cost: { blue: 3, green: 3, red: 5, black: 3 } },
  { points: 4, discount: 'white', cost: { black: 7 } },
  { points: 4, discount: 'white', cost: { white: 3, red: 3, black: 6 } },
  { points: 5, discount: 'white', cost: { white: 3, black: 7 } },
];

// Noble tiles - each requires owning a certain number of bonus cards (not gems/chips)
// Named after historical Renaissance figures
const NOBLE_TILES = [
  { id: 1, points: 3, name: 'Catherine de Medici', condition: { blue: 3, green: 3, red: 3 } },
  { id: 2, points: 3, name: 'Elisabeth of Austria', condition: { white: 3, blue: 3, black: 3 } },
  { id: 3, points: 3, name: 'Isabella I of Castile', condition: { white: 4, red: 4 } },
  { id: 4, points: 3, name: 'Niccolo Machiavelli', condition: { white: 4, blue: 4 } },
  { id: 5, points: 3, name: 'Suleiman the Magnificent', condition: { blue: 4, green: 4 } },
  { id: 6, points: 3, name: 'Anne of Brittany', condition: { white: 3, blue: 3, green: 3 } },
  { id: 7, points: 3, name: 'Charles V', condition: { white: 3, red: 3, black: 3 } },
  { id: 8, points: 3, name: 'Francis I of France', condition: { green: 3, red: 3, black: 3 } },
  { id: 9, points: 3, name: 'Henry VIII', condition: { red: 4, black: 4 } },
  { id: 10, points: 3, name: 'Mary Stuart', condition: { green: 4, red: 4 } },
];

// BONUS_TILES kept as alias for backward compatibility
const BONUS_TILES = NOBLE_TILES;

module.exports = { LEVEL1_CARDS, LEVEL2_CARDS, LEVEL3_CARDS, NOBLE_TILES, BONUS_TILES };
