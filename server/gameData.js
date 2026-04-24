// All card and bonus tile data for the game
// Colors: black, white, blue, green, red

const LEVEL1_CARDS = [
  // Format: { points, discount, cost: { black, white, blue, green, red } }
  { points: 0, discount: 'black', cost: { white: 1, blue: 1, green: 1, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 1, blue: 2, green: 1, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 2, blue: 2, red: 1 } },
  { points: 0, discount: 'black', cost: { green: 1, red: 3, black: 1 } },
  { points: 0, discount: 'black', cost: { green: 2, red: 1 } },
  { points: 0, discount: 'black', cost: { white: 2, green: 2 } },
  { points: 0, discount: 'black', cost: { green: 3 } },
  { points: 1, discount: 'black', cost: { blue: 4 } },

  { points: 0, discount: 'white', cost: { blue: 1, green: 1, red: 1, black: 1 } },
  { points: 0, discount: 'white', cost: { blue: 1, green: 2, red: 1, black: 1 } },
  { points: 0, discount: 'white', cost: { blue: 2, green: 2, black: 1 } },
  { points: 0, discount: 'white', cost: { red: 2, black: 1 } },
  { points: 0, discount: 'white', cost: { blue: 2, black: 2 } },
  { points: 0, discount: 'white', cost: { blue: 3 } },
  { points: 0, discount: 'white', cost: { red: 1, black: 2, white: 1, green: 1 } },
  { points: 1, discount: 'white', cost: { green: 4 } },

  { points: 0, discount: 'blue', cost: { white: 1, green: 1, red: 1, black: 1 } },
  { points: 0, discount: 'blue', cost: { white: 1, green: 1, red: 2, black: 1 } },
  { points: 0, discount: 'blue', cost: { white: 1, green: 2, red: 2 } },
  { points: 0, discount: 'blue', cost: { green: 2, black: 2 } },
  { points: 0, discount: 'blue', cost: { white: 1, black: 3, green: 1 } },
  { points: 0, discount: 'blue', cost: { black: 3 } },
  { points: 0, discount: 'blue', cost: { white: 2, red: 1 } },
  { points: 1, discount: 'blue', cost: { red: 4 } },

  { points: 0, discount: 'green', cost: { white: 1, blue: 1, red: 1, black: 1 } },
  { points: 0, discount: 'green', cost: { white: 1, blue: 1, red: 1, black: 2 } },
  { points: 0, discount: 'green', cost: { white: 2, blue: 1, black: 2 } },
  { points: 0, discount: 'green', cost: { blue: 2, red: 2 } },
  { points: 0, discount: 'green', cost: { white: 2, blue: 1, red: 1, black: 1 } },
  { points: 0, discount: 'green', cost: { red: 3 } },
  { points: 0, discount: 'green', cost: { white: 1, black: 2 } },
  { points: 1, discount: 'green', cost: { white: 4 } },

  { points: 0, discount: 'red', cost: { white: 1, blue: 1, green: 1, black: 1 } },
  { points: 0, discount: 'red', cost: { white: 2, blue: 1, green: 1, black: 1 } },
  { points: 0, discount: 'red', cost: { white: 2, red: 2 } },
  { points: 0, discount: 'red', cost: { white: 2, green: 1, black: 1, blue: 1 } },
  { points: 0, discount: 'red', cost: { white: 2, blue: 2, green: 1 } },
  { points: 0, discount: 'red', cost: { white: 3 } },
  { points: 0, discount: 'red', cost: { blue: 2, green: 1 } },
  { points: 1, discount: 'red', cost: { black: 4 } },
];

const LEVEL2_CARDS = [
  { points: 1, discount: 'black', cost: { white: 3, blue: 2, green: 2 } },
  { points: 1, discount: 'black', cost: { white: 3, green: 3, black: 2 } },
  { points: 2, discount: 'black', cost: { blue: 1, green: 4, red: 2 } },
  { points: 2, discount: 'black', cost: { green: 5, red: 3 } },
  { points: 2, discount: 'black', cost: { white: 5 } },
  { points: 3, discount: 'black', cost: { black: 6 } },

  { points: 1, discount: 'white', cost: { green: 3, red: 2, black: 2 } },
  { points: 1, discount: 'white', cost: { blue: 2, green: 3, red: 3 } },
  { points: 2, discount: 'white', cost: { red: 1, black: 3, white: 2, blue: 3 } },
  { points: 2, discount: 'white', cost: { red: 5 } },
  { points: 2, discount: 'white', cost: { red: 5, black: 3 } },
  { points: 3, discount: 'white', cost: { white: 6 } },

  { points: 1, discount: 'blue', cost: { blue: 2, green: 2, red: 3 } },
  { points: 1, discount: 'blue', cost: { blue: 2, green: 3, black: 3 } },
  { points: 2, discount: 'blue', cost: { white: 5, blue: 3 } },
  { points: 2, discount: 'blue', cost: { white: 2, red: 1, black: 4 } },
  { points: 2, discount: 'blue', cost: { blue: 5 } },
  { points: 3, discount: 'blue', cost: { blue: 6 } },

  { points: 1, discount: 'green', cost: { white: 2, blue: 3, black: 2 } },
  { points: 1, discount: 'green', cost: { white: 3, green: 2, red: 3 } },
  { points: 2, discount: 'green', cost: { white: 4, blue: 2, black: 1 } },
  { points: 2, discount: 'green', cost: { green: 5 } },
  { points: 2, discount: 'green', cost: { blue: 5, green: 3 } },
  { points: 3, discount: 'green', cost: { green: 6 } },

  { points: 1, discount: 'red', cost: { white: 2, red: 2, black: 3 } },
  { points: 1, discount: 'red', cost: { white: 3, blue: 3, green: 2 } },
  { points: 2, discount: 'red', cost: { white: 1, blue: 4, green: 2 } },
  { points: 2, discount: 'red', cost: { black: 5 } },
  { points: 2, discount: 'red', cost: { white: 3, black: 5 } },
  { points: 3, discount: 'red', cost: { red: 6 } },
];

const LEVEL3_CARDS = [
  { points: 3, discount: 'black', cost: { white: 3, blue: 3, green: 5, red: 3 } },
  { points: 4, discount: 'black', cost: { red: 7 } },
  { points: 4, discount: 'black', cost: { green: 3, red: 6, black: 3 } },
  { points: 5, discount: 'black', cost: { red: 7, black: 3 } },

  { points: 3, discount: 'white', cost: { blue: 3, green: 3, red: 5, black: 3 } },
  { points: 4, discount: 'white', cost: { black: 7 } },
  { points: 4, discount: 'white', cost: { white: 3, red: 3, black: 6 } },
  { points: 5, discount: 'white', cost: { white: 3, black: 7 } },

  { points: 3, discount: 'blue', cost: { white: 3, green: 3, red: 3, black: 5 } },
  { points: 4, discount: 'blue', cost: { white: 7 } },
  { points: 4, discount: 'blue', cost: { white: 6, blue: 3, black: 3 } },
  { points: 5, discount: 'blue', cost: { white: 7, blue: 3 } },

  { points: 3, discount: 'green', cost: { white: 5, blue: 3, red: 3, black: 3 } },
  { points: 4, discount: 'green', cost: { blue: 7 } },
  { points: 4, discount: 'green', cost: { white: 3, blue: 6, green: 3 } },
  { points: 5, discount: 'green', cost: { blue: 7, green: 3 } },

  { points: 3, discount: 'red', cost: { white: 3, blue: 5, green: 3, black: 3 } },
  { points: 4, discount: 'red', cost: { green: 7 } },
  { points: 4, discount: 'red', cost: { blue: 3, green: 6, red: 3 } },
  { points: 5, discount: 'red', cost: { green: 7, red: 3 } },
];

const BONUS_TILES = [
  { points: 3, condition: { black: 3, blue: 3, white: 3 } },
  { points: 3, condition: { green: 3, blue: 3, red: 3 } },
  { points: 3, condition: { black: 3, red: 3, white: 3 } },
  { points: 3, condition: { black: 3, green: 3, red: 3 } },
  { points: 3, condition: { green: 3, blue: 3, white: 3 } },
  { points: 3, condition: { black: 3, green: 3, blue: 3 } },
  { points: 3, condition: { black: 4 } },
  { points: 3, condition: { white: 4 } },
  { points: 3, condition: { blue: 4 } },
  { points: 3, condition: { green: 4 } },
];

module.exports = { LEVEL1_CARDS, LEVEL2_CARDS, LEVEL3_CARDS, BONUS_TILES };
