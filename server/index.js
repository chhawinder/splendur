const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { createGoogleUser, getUserByEmail, getUserByGoogleId, getUserById, updateRating, recordGamePlayed } = require('./db');
const { createGame, takeChips, returnChips, reserveCard, purchaseCard, endTurn, getPublicGameState } = require('./gameEngine');
const { cpuTurn } = require('./cpuPlayer');
const { checkAndAwardBadges, getPlayerBadgesWithDefs, getDailyChallenges, getWeeklyChallenges } = require('./badges');

const app = express();
const server = http.createServer(app);
const JWT_SECRET = 'splendur-secret-key-change-in-prod';

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Serve static files in production
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// ============ AUTH ROUTES ============
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'No credential provided' });

    // Decode the Google JWT token (the ID token from Google Sign-In)
    const parts = credential.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid token format' });
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'No email in token' });

    // Check if user already exists by Google ID or email
    let user = getUserByGoogleId(googleId) || getUserByEmail(email);

    if (!user) {
      // Create new user
      const id = uuidv4();
      const username = name || email.split('@')[0];
      createGoogleUser(id, username, email, googleId, picture);
      user = getUserById(id);
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, rating: user.rating, wins: user.wins, losses: user.losses }
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const user = getUserById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Badge & challenge endpoints
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/badges', authMiddleware, (req, res) => {
  const badges = getPlayerBadgesWithDefs(req.user.id);
  res.json({ badges });
});

app.get('/api/challenges', authMiddleware, (req, res) => {
  const daily = getDailyChallenges(req.user.id);
  const weekly = getWeeklyChallenges(req.user.id);
  res.json({ daily, weekly });
});

app.get('/api/profile', authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const badges = getPlayerBadgesWithDefs(req.user.id);
  const daily = getDailyChallenges(req.user.id);
  const weekly = getWeeklyChallenges(req.user.id);
  res.json({ user, badges, daily, weekly });
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// ============ GAME STATE ============
const lobbies = new Map(); // lobbyId -> { id, name, host, players: [{id,name,isCPU}], maxPlayers, started }
const activeGames = new Map(); // gameId -> game state
const playerSockets = new Map(); // odId -> socket
const socketPlayers = new Map(); // socketId -> { userId, username }

// ============ SOCKET.IO ============
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

function broadcastLobbyLists() {
  io.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
  const games = [];
  for (const [id, game] of activeGames) {
    if (game.phase !== 'ended') {
      games.push({
        id,
        players: game.players.map(p => ({ name: p.name, points: p.points })),
        turnNumber: game.turnNumber,
        phase: game.phase,
      });
    }
  }
  io.emit('activeGamesList', games);
}

io.on('connection', (socket) => {
  playerSockets.set(socket.userId, socket);
  socketPlayers.set(socket.id, { userId: socket.userId, username: socket.username });

  socket.emit('connected', { userId: socket.userId, username: socket.username });

  // ---- LOBBY ----
  socket.on('createLobby', ({ name, maxPlayers }) => {
    const lobbyId = uuidv4().slice(0, 8);
    const lobby = {
      id: lobbyId,
      name: name || `${socket.username}'s game`,
      host: socket.userId,
      players: [{ id: socket.userId, name: socket.username, isCPU: false }],
      maxPlayers: maxPlayers || 2,
      started: false,
    };
    lobbies.set(lobbyId, lobby);
    socket.join(`lobby_${lobbyId}`);
    socket.emit('lobbyCreated', lobby);
    broadcastLobbyLists();
  });

  socket.on('getLobbies', () => {
    socket.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
    const games = [];
    for (const [id, game] of activeGames) {
      if (game.phase !== 'ended') {
        games.push({
          id,
          players: game.players.map(p => ({ name: p.name, points: p.points })),
          turnNumber: game.turnNumber,
          phase: game.phase,
        });
      }
    }
    socket.emit('activeGamesList', games);
  });

  socket.on('spectateGame', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return socket.emit('error', { message: 'Game not found' });
    socket.join(`game_${gameId}`);
    // Track spectator
    if (!game.spectators) game.spectators = new Set();
    game.spectators.add(socket.userId);
    // Send game state (spectator sees all public info, no one's reserved cards)
    const state = getPublicGameState(game, '__spectator__');
    state.isSpectator = true;
    socket.emit('gameState', state);
  });

  socket.on('stopSpectating', ({ gameId }) => {
    socket.leave(`game_${gameId}`);
    const game = activeGames.get(gameId);
    if (game?.spectators) game.spectators.delete(socket.userId);
  });

  socket.on('joinLobby', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', { message: 'Lobby not found' });
    if (lobby.started) return socket.emit('error', { message: 'Game already started' });
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', { message: 'Lobby full' });
    if (lobby.players.find(p => p.id === socket.userId)) return socket.emit('error', { message: 'Already in lobby' });

    lobby.players.push({ id: socket.userId, name: socket.username, isCPU: false });
    socket.join(`lobby_${lobbyId}`);
    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    broadcastLobbyLists();
  });

  socket.on('leaveLobby', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    if (lobby.host === socket.userId) {
      // Host leaves — close the lobby, notify everyone
      io.to(`lobby_${lobbyId}`).emit('lobbyClosed');
      lobbies.delete(lobbyId);
    } else {
      // Non-host leaves
      lobby.players = lobby.players.filter(p => p.id !== socket.userId);
      socket.leave(`lobby_${lobbyId}`);
      socket.emit('lobbyLeft');
      io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    }
    broadcastLobbyLists();
  });

  socket.on('kickPlayer', ({ lobbyId, playerId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.host !== socket.userId) return;
    if (playerId === lobby.host) return; // Can't kick yourself

    const kicked = lobby.players.find(p => p.id === playerId);
    if (!kicked) return;

    lobby.players = lobby.players.filter(p => p.id !== playerId);

    // If kicked player is a real player (not CPU), notify them
    if (!kicked.isCPU) {
      const kickedSocket = playerSockets.get(playerId);
      if (kickedSocket) {
        kickedSocket.leave(`lobby_${lobbyId}`);
        kickedSocket.emit('lobbyKicked');
      }
    }

    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    broadcastLobbyLists();
  });

  socket.on('addCPU', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.host !== socket.userId) return;
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', { message: 'Lobby full' });

    const cpuId = `cpu_${uuidv4().slice(0, 6)}`;
    lobby.players.push({ id: cpuId, name: `CPU ${lobby.players.length}`, isCPU: true });
    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
  });

  socket.on('startGame', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.host !== socket.userId) return;
    if (lobby.players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });

    lobby.started = true;
    const playerIds = lobby.players.map(p => p.id);
    const playerNames = lobby.players.map(p => p.name);
    const game = createGame(playerIds, playerNames);
    game.lobbyId = lobbyId;
    game.cpuPlayers = lobby.players.filter(p => p.isCPU).map(p => p.id);
    activeGames.set(game.id, game);

    // Move all sockets to game room
    for (const p of lobby.players) {
      const ps = playerSockets.get(p.id);
      if (ps) {
        ps.join(`game_${game.id}`);
      }
    }

    io.to(`lobby_${lobbyId}`).emit('gameStarted', { gameId: game.id });

    // Send initial state to each player
    for (const p of game.players) {
      const ps = playerSockets.get(p.id);
      if (ps) {
        ps.emit('gameState', getPublicGameState(game, p.id));
      }
    }

    broadcastLobbyLists();

    // If first player is CPU, trigger their turn
    if (game.cpuPlayers.includes(game.players[game.currentPlayerIndex].id)) {
      setTimeout(() => processCpuTurn(game), 1000);
    }
  });

  // ---- GAME ACTIONS ----
  socket.on('takeChips', ({ gameId, chips }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const result = takeChips(game, socket.userId, chips);
    if (result.error) return socket.emit('actionError', { message: result.error });

    if (result.needsReturn) {
      socket.emit('needsReturn', { currentChips: game.players.find(p => p.id === socket.userId).chips });
    } else {
      finishTurn(game);
    }
  });

  socket.on('returnChips', ({ gameId, chips }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const result = returnChips(game, socket.userId, chips);
    if (result.error) return socket.emit('actionError', { message: result.error });
    finishTurn(game);
  });

  socket.on('reserveCard', ({ gameId, cardId, fromDeck }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const result = reserveCard(game, socket.userId, cardId, fromDeck);
    if (result.error) return socket.emit('actionError', { message: result.error });

    if (result.needsReturn) {
      socket.emit('needsReturn', { currentChips: game.players.find(p => p.id === socket.userId).chips });
    } else {
      finishTurn(game);
    }
  });

  socket.on('purchaseCard', ({ gameId, cardId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const result = purchaseCard(game, socket.userId, cardId);
    if (result.error) return socket.emit('actionError', { message: result.error });
    finishTurn(game);
  });

  socket.on('resign', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game || game.phase === 'ended') return;

    const resignPlayer = game.players.find(p => p.id === socket.userId);
    if (!resignPlayer) return;

    // Mark player as resigned
    resignPlayer.resigned = true;
    game.log.push(`${resignPlayer.name} has resigned!`);

    // Return resigned player's chips to the bank
    for (const [color, amount] of Object.entries(resignPlayer.chips)) {
      game.bank[color] = (game.bank[color] || 0) + amount;
      resignPlayer.chips[color] = 0;
    }

    const activePlayers = game.players.filter(p => !p.resigned);

    if (activePlayers.length <= 1) {
      // Only one player left — they win
      game.phase = 'ended';
      if (activePlayers.length === 1) {
        game.winner = activePlayers[0].id;
        game.log.push(`${activePlayers[0].name} wins!`);
      }
      applyRatings(game);
      broadcastGameState(game);
    } else {
      // Game continues — if it was the resigned player's turn, advance
      if (game.players[game.currentPlayerIndex].id === socket.userId) {
        advanceToNextActivePlayer(game);
        broadcastGameState(game);
        // If next player is CPU, process their turn
        if (game.cpuPlayers && game.cpuPlayers.includes(game.players[game.currentPlayerIndex].id)) {
          setTimeout(() => processCpuTurn(game), 1200);
        }
      } else {
        broadcastGameState(game);
      }
    }
  });

  socket.on('disconnect', () => {
    playerSockets.delete(socket.userId);
    socketPlayers.delete(socket.id);
  });
});

function calculateElo(winnerRating, loserRating, K = 32) {
  const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerNew = Math.round(winnerRating + K * (1 - expected));
  const loserNew = Math.round(loserRating + K * (0 - (1 - expected)));
  return { winnerNew, loserNew, winnerGain: winnerNew - winnerRating, loserLoss: loserRating - loserNew };
}

function applyRatings(game) {
  if (game.ratingsApplied) return;
  game.ratingsApplied = true;

  const winnerId = game.winner;
  if (!winnerId) return;

  const humanPlayers = game.players.filter(p => !game.cpuPlayers?.includes(p.id));
  const ratingChanges = {};

  if (humanPlayers.length >= 2) {
    // PvP: full ELO calculation between human players
    const winner = getUserById(winnerId);
    if (winner) {
      const losers = humanPlayers.filter(p => p.id !== winnerId);
      for (const loser of losers) {
        const loserUser = getUserById(loser.id);
        if (!loserUser) continue;
        const { winnerNew, loserNew, winnerGain, loserLoss } = calculateElo(winner.rating, loserUser.rating);
        updateRating(winnerId, winnerNew, true);
        updateRating(loser.id, loserNew, false);
        ratingChanges[winnerId] = { newRating: winnerNew, change: `+${winnerGain}` };
        ratingChanges[loser.id] = { newRating: loserNew, change: `-${loserLoss}` };
      }
    }
  } else if (humanPlayers.length === 1) {
    // vs CPU: only count as game played, no rating/win/loss change
    const human = humanPlayers[0];
    recordGamePlayed(human.id, true);
  }

  game.ratingChanges = ratingChanges;

  // Check badges for all human players
  game.newBadges = {};
  for (const p of humanPlayers) {
    const earned = checkAndAwardBadges(p.id);
    if (earned.length > 0) {
      game.newBadges[p.id] = earned;
    }
  }
}

function advanceToNextActivePlayer(game) {
  // Move to next non-resigned player
  const numPlayers = game.players.length;
  for (let i = 0; i < numPlayers; i++) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % numPlayers;
    if (!game.players[game.currentPlayerIndex].resigned) break;
  }
}

function broadcastGameState(game) {
  for (const p of game.players) {
    const ps = playerSockets.get(p.id);
    if (ps) {
      const state = getPublicGameState(game, p.id);
      state.ratingChanges = game.ratingChanges || null;
      state.newBadges = game.newBadges?.[p.id] || null;
      ps.emit('gameState', state);
    }
  }
  // Broadcast to spectators
  if (game.spectators) {
    for (const specId of game.spectators) {
      const ss = playerSockets.get(specId);
      if (ss) {
        const state = getPublicGameState(game, '__spectator__');
        state.isSpectator = true;
        ss.emit('gameState', state);
      }
    }
  }
}

function finishTurn(game) {
  endTurn(game);

  if (game.phase === 'ended') {
    applyRatings(game);
    broadcastLobbyLists(); // Update active games list for lobby viewers
  }

  broadcastGameState(game);

  // If next player is CPU (and not resigned), process their turn
  const nextPlayer = game.players[game.currentPlayerIndex];
  if (game.phase !== 'ended' && !nextPlayer.resigned && game.cpuPlayers && game.cpuPlayers.includes(nextPlayer.id)) {
    setTimeout(() => processCpuTurn(game), 1200);
  }
}

function processCpuTurn(game) {
  if (game.phase === 'ended') return;
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer.resigned) return;
  const cpuId = currentPlayer.id;
  const decision = cpuTurn(game, cpuId);
  if (!decision) return;

  let result;
  switch (decision.action) {
    case 'purchase':
      result = purchaseCard(game, cpuId, decision.cardId);
      break;
    case 'takeChips':
      result = takeChips(game, cpuId, decision.chips);
      break;
    case 'reserve':
      result = reserveCard(game, cpuId, decision.cardId, decision.fromDeck);
      break;
    default:
      // Pass - just end turn
      break;
  }

  finishTurn(game);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Splendur server running on port ${PORT}`);
});
