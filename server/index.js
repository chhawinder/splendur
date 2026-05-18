const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { createGoogleUser, getUserByEmail, getUserByGoogleId, getUserById, updateRating, recordGamePlayed, updateAvatar, updateUsername } = require('./db');
const { createGame, takeChips, returnChips, reserveCard, purchaseCard, endTurn, getPublicGameState } = require('./gameEngine');
const { cpuTurn } = require('./cpuPlayer');
const { checkAndAwardBadges, getPlayerBadgesWithDefs, getDailyChallenges, getWeeklyChallenges, getNewlyCompletedChallenges } = require('./badges');

const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET || 'splendur-secret-key-change-in-prod';

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Serve static files in production (only if client build exists)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// ============ AUTH ROUTES ============
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'No credential provided' });

    const parts = credential.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid token format' });
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'No email in token' });

    let user = getUserByGoogleId(googleId) || getUserByEmail(email);

    if (!user) {
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

app.post('/api/avatar', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: 'No avatar provided' });
    updateAvatar(decoded.id, avatar);
    const user = getUserById(decoded.id);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/username', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    const { username } = req.body;
    if (!username || username.trim().length < 2 || username.trim().length > 20) {
      return res.status(400).json({ error: 'Username must be 2-20 characters' });
    }
    updateUsername(decoded.id, username.trim());
    const user = getUserById(decoded.id);
    res.json({ user });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username already taken' });
    }
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

// Admin stats endpoint
app.get('/api/stats', (req, res) => {
  const db = require('./db');
  const users = db.getAllUsers ? db.getAllUsers() : [];
  res.json({ totalUsers: users.length, users: users.map(u => ({ username: u.username, created_at: u.created_at, total_games: u.total_games })) });
});

// Catch-all for SPA (only if client build exists)
if (require('fs').existsSync(path.join(clientDistPath, 'index.html'))) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ============ GAME STATE ============
const lobbies = new Map(); // lobbyId -> { id, name, host, players: [{id,name,isCPU}], maxPlayers, started }
const activeGames = new Map(); // gameId -> game state
const TOTAL_ROOM_IMAGES = 10; // Must match client-side ROOM_IMAGES array length
let roomImageCounter = 0; // Cycles through images so each room gets a different one
const playerSockets = new Map(); // odId -> socket
const socketPlayers = new Map(); // socketId -> { userId, username }
// Track what each player is doing: { gameId, role: 'playing'|'spectating' }
const playerActivity = new Map();
const disconnectTimers = new Map(); // userId -> setTimeout handle for reconnection grace period

// ============ HELPERS ============
function broadcastLobbyLists() {
  io.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
  const games = [];
  for (const [id, game] of activeGames) {
    if (game.phase !== 'ended') {
      games.push({
        id,
        players: game.players.map(p => ({ id: p.id, name: p.name, points: p.points, avatar: p.avatar || null, isCPU: p.isCPU || false })),
        turnNumber: game.turnNumber,
        phase: game.phase,
      });
    }
  }
  io.emit('activeGamesList', games);
}

// Clean up a game if all human players are gone
function cleanupGameIfAbandoned(game) {
  if (!game || game.phase === 'ended') return;

  const humanPlayers = game.players.filter(p => !game.cpuPlayers?.includes(p.id));
  const activeHumans = humanPlayers.filter(p => !p.resigned);

  if (activeHumans.length === 0) {
    // All humans left/resigned — end the game
    game.phase = 'ended';
    game.log.push('Game abandoned — all human players left.');
    const timerHandle = gameTimerHandles.get(game.id);
    if (timerHandle) { clearTimeout(timerHandle); gameTimerHandles.delete(game.id); }
    activeGames.delete(game.id);
    if (game.lobbyId) lobbies.delete(game.lobbyId);
    broadcastLobbyLists();
  }
}

// Remove player from whatever they're doing (game/spectating)
function clearPlayerActivity(userId) {
  const activity = playerActivity.get(userId);
  if (!activity) return;

  const game = activeGames.get(activity.gameId);

  if (activity.role === 'spectating' && game) {
    if (game.spectators) game.spectators.delete(userId);
    const s = playerSockets.get(userId);
    if (s) s.leave(`game_${activity.gameId}`);
  }

  if (activity.role === 'playing' && game && game.phase !== 'ended') {
    // Auto-resign this player
    const player = game.players.find(p => p.id === userId);
    if (player && !player.resigned) {
      player.resigned = true;
      game.log.push(`${player.name} left the game.`);

      // Return chips to bank
      for (const [color, amount] of Object.entries(player.chips)) {
        game.bank[color] = (game.bank[color] || 0) + amount;
        player.chips[color] = 0;
      }

      const activePlayers = game.players.filter(p => !p.resigned);

      if (activePlayers.length <= 1) {
        game.phase = 'ended';
        if (activePlayers.length === 1) {
          game.winner = activePlayers[0].id;
          game.log.push(`${activePlayers[0].name} wins!`);
        }
        applyRatings(game);
        broadcastGameState(game);
        setTimeout(() => {
          activeGames.delete(game.id);
          if (game.lobbyId) lobbies.delete(game.lobbyId);
          broadcastLobbyLists();
        }, 5000);
      } else {
        // If it was this player's turn, advance
        if (game.players[game.currentPlayerIndex].id === userId) {
          advanceToNextActivePlayer(game);
        }
        broadcastGameState(game);
        cleanupGameIfAbandoned(game);
        // If next player is CPU, process
        const next = game.players[game.currentPlayerIndex];
        if (game.phase !== 'ended' && game.cpuPlayers?.includes(next.id) && !next.resigned) {
          setTimeout(() => processCpuTurn(game), 6000);
        }
      }
    }
  }

  playerActivity.delete(userId);
}

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

io.on('connection', (socket) => {
  playerSockets.set(socket.userId, socket);
  socketPlayers.set(socket.id, { userId: socket.userId, username: socket.username });

  // Cancel any pending disconnect timer (player reconnected)
  const pendingTimer = disconnectTimers.get(socket.userId);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    disconnectTimers.delete(socket.userId);
  }

  socket.emit('connected', { userId: socket.userId, username: socket.username });

  // Check if player was in an active game (reconnection after page reload)
  socket.on('checkActiveGame', () => {
    const activity = playerActivity.get(socket.userId);
    if (activity && activity.gameId) {
      const game = activeGames.get(activity.gameId);
      if (game && game.phase !== 'ended') {
        socket.emit('activeGameFound', {
          gameId: activity.gameId,
          role: activity.role,
        });
        return;
      }
      // Game ended or not found — clean up stale activity
      playerActivity.delete(socket.userId);
    }
    socket.emit('activeGameFound', { gameId: null });
  });

  // ---- LOBBY ----
  socket.on('createLobby', ({ name, maxPlayers, targetScore, timeControl }) => {
    // Must not be in an active game
    const activity = playerActivity.get(socket.userId);
    if (activity) {
      return socket.emit('error', { message: 'You are already in a game. Leave it first.' });
    }
    // Must not already be in a lobby
    for (const [, existingLobby] of lobbies) {
      if (!existingLobby.started && existingLobby.players.some(p => p.id === socket.userId)) {
        return socket.emit('error', { message: 'You are already in a lobby. Leave it first.' });
      }
    }

    const lobbyId = uuidv4().slice(0, 8);
    const hostUser = getUserById(socket.userId);
    const freshName = hostUser?.username || socket.username;
    const lobby = {
      id: lobbyId,
      name: name || `${freshName}'s game`,
      host: socket.userId,
      players: [{ id: socket.userId, name: freshName, isCPU: false, rating: hostUser?.rating || 1500, avatar: hostUser?.avatar || null }],
      maxPlayers: maxPlayers || 2,
      targetScore: targetScore || 15,
      timeControl: timeControl || null, // ms per player (null = no timer, 300000 = 5min, 600000 = 10min)
      started: false,
      roomImage: roomImageCounter++ % TOTAL_ROOM_IMAGES,
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
          players: game.players.map(p => ({ id: p.id, name: p.name, points: p.points, avatar: p.avatar || null, isCPU: p.isCPU || false })),
          turnNumber: game.turnNumber,
          phase: game.phase,
        });
      }
    }
    socket.emit('activeGamesList', games);
  });

  socket.on('getGameState', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) {
      return socket.emit('gameNotFound');
    }
    socket.join(`game_${gameId}`);
    const isPlayer = game.players.some(p => p.id === socket.userId);
    if (isPlayer) {
      playerActivity.set(socket.userId, { gameId, role: 'playing' });
      const state = getPublicGameState(game, socket.userId);
      state.ratingChanges = game.ratingChanges || null;
      state.newBadges = game.newBadges?.[socket.userId] || null;
      state.completedChallenges = game.completedChallenges?.[socket.userId] || null;
      socket.emit('gameState', state);
    } else {
      // Treat as spectator
      if (!game.spectators) game.spectators = new Set();
      game.spectators.add(socket.userId);
      playerActivity.set(socket.userId, { gameId, role: 'spectating' });
      const state = getPublicGameState(game, '__spectator__');
      state.isSpectator = true;
      socket.emit('gameState', state);
    }
  });

  socket.on('spectateGame', ({ gameId }) => {
    // Clear any previous activity
    clearPlayerActivity(socket.userId);

    const game = activeGames.get(gameId);
    if (!game) return socket.emit('gameNotFound');
    socket.join(`game_${gameId}`);
    if (!game.spectators) game.spectators = new Set();
    game.spectators.add(socket.userId);
    playerActivity.set(socket.userId, { gameId, role: 'spectating' });
    const state = getPublicGameState(game, '__spectator__');
    state.isSpectator = true;
    socket.emit('gameState', state);
  });

  socket.on('stopSpectating', ({ gameId }) => {
    socket.leave(`game_${gameId}`);
    const game = activeGames.get(gameId);
    if (game?.spectators) game.spectators.delete(socket.userId);
    playerActivity.delete(socket.userId);
  });

  socket.on('joinLobby', ({ lobbyId }) => {
    const activity = playerActivity.get(socket.userId);
    if (activity) {
      return socket.emit('error', { message: 'You are already in a game. Leave it first.' });
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) return socket.emit('error', { message: 'Lobby not found' });
    if (lobby.started) return socket.emit('error', { message: 'Game already started' });
    if (lobby.players.length >= lobby.maxPlayers) return socket.emit('error', { message: 'Lobby full' });
    if (lobby.players.find(p => p.id === socket.userId)) return socket.emit('error', { message: 'Already in lobby' });

    const joiningUser = getUserById(socket.userId);
    const joinName = joiningUser?.username || socket.username;
    lobby.players.push({ id: socket.userId, name: joinName, isCPU: false, rating: joiningUser?.rating || 1500, avatar: joiningUser?.avatar || null });
    socket.join(`lobby_${lobbyId}`);
    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    broadcastLobbyLists();
  });

  socket.on('leaveLobby', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    if (lobby.host === socket.userId) {
      io.to(`lobby_${lobbyId}`).emit('lobbyClosed');
      lobbies.delete(lobbyId);
    } else {
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
    if (playerId === lobby.host) return;

    const kicked = lobby.players.find(p => p.id === playerId);
    if (!kicked) return;

    lobby.players = lobby.players.filter(p => p.id !== playerId);

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
    lobby.players.push({ id: cpuId, name: `CPU ${lobby.players.length}`, isCPU: true, rating: null, avatar: null });
    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    broadcastLobbyLists();
  });

  socket.on('changeMaxPlayers', ({ lobbyId, delta }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.host !== socket.userId) return;
    const newMax = lobby.maxPlayers + delta;
    if (newMax < lobby.players.length) return socket.emit('error', { message: 'Cannot reduce below current player count' });
    if (newMax < 2 || newMax > 4) return;
    lobby.maxPlayers = newMax;
    io.to(`lobby_${lobbyId}`).emit('lobbyUpdated', lobby);
    broadcastLobbyLists();
  });

  socket.on('startGame', ({ lobbyId }) => {
    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.host !== socket.userId) return;
    if (lobby.players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });

    lobby.started = true;
    const playerIds = lobby.players.map(p => p.id);
    const playerNames = lobby.players.map(p => p.name);
    const game = createGame(playerIds, playerNames, lobby.targetScore, lobby.timeControl);
    game.lobbyId = lobbyId;
    game.cpuPlayers = lobby.players.filter(p => p.isCPU).map(p => p.id);
    // Attach avatar and isCPU to game players
    for (const lp of lobby.players) {
      const gp = game.players.find(p => p.id === lp.id);
      if (gp) {
        gp.avatar = lp.avatar || null;
        gp.isCPU = lp.isCPU || false;
      }
    }
    activeGames.set(game.id, game);

    // Move all human sockets to game room and track activity
    for (const p of lobby.players) {
      if (!p.isCPU) {
        playerActivity.set(p.id, { gameId: game.id, role: 'playing' });
      }
      const ps = playerSockets.get(p.id);
      if (ps) {
        ps.join(`game_${game.id}`);
      }
    }

    io.to(`lobby_${lobbyId}`).emit('gameStarted', { gameId: game.id });

    // Send initial state to each human player
    for (const p of game.players) {
      const ps = playerSockets.get(p.id);
      if (ps) {
        ps.emit('gameState', getPublicGameState(game, p.id));
      }
    }

    broadcastLobbyLists();

    // Start the turn clock for the first player
    startTurnClock(game);

    // If first player is CPU, trigger their turn
    if (game.cpuPlayers.includes(game.players[game.currentPlayerIndex].id)) {
      setTimeout(() => processCpuTurn(game), 6000);
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

    resignPlayer.resigned = true;
    game.log.push(`${resignPlayer.name} has resigned!`);

    // Return resigned player's chips to the bank
    for (const [color, amount] of Object.entries(resignPlayer.chips)) {
      game.bank[color] = (game.bank[color] || 0) + amount;
      resignPlayer.chips[color] = 0;
    }

    // Clear their activity
    playerActivity.delete(socket.userId);
    socket.leave(`game_${gameId}`);

    const activePlayers = game.players.filter(p => !p.resigned);

    if (activePlayers.length <= 1) {
      game.phase = 'ended';
      if (activePlayers.length === 1) {
        game.winner = activePlayers[0].id;
        game.log.push(`${activePlayers[0].name} wins!`);
      }
      applyRatings(game);
      broadcastGameState(game);
      setTimeout(() => {
        activeGames.delete(game.id);
        if (game.lobbyId) lobbies.delete(game.lobbyId);
        // Clear activity for remaining players
        for (const p of game.players) {
          if (playerActivity.get(p.id)?.gameId === game.id) {
            playerActivity.delete(p.id);
          }
        }
        broadcastLobbyLists();
      }, 5000);
    } else {
      if (game.players[game.currentPlayerIndex].id === socket.userId) {
        advanceToNextActivePlayer(game);
      }
      broadcastGameState(game);
      cleanupGameIfAbandoned(game);
      const next = game.players[game.currentPlayerIndex];
      if (game.phase !== 'ended' && game.cpuPlayers?.includes(next.id) && !next.resigned) {
        setTimeout(() => processCpuTurn(game), 6000);
      }
    }
  });

  // When player leaves the game page (back to lobby)
  socket.on('leaveGame', ({ gameId }) => {
    clearPlayerActivity(socket.userId);
    socket.leave(`game_${gameId}`);
  });

  socket.on('disconnect', () => {
    const activity = playerActivity.get(socket.userId);

    // If player is in an active game, give them a grace period to reconnect
    if (activity && activity.role === 'playing') {
      const game = activeGames.get(activity.gameId);
      if (game && game.phase !== 'ended') {
        // Set a 30-second reconnection timer
        const timer = setTimeout(() => {
          // Only resign if still disconnected (no new socket for this user)
          if (!playerSockets.has(socket.userId)) {
            clearPlayerActivity(socket.userId);
          }
          disconnectTimers.delete(socket.userId);
        }, 30000);
        disconnectTimers.set(socket.userId, timer);
        playerSockets.delete(socket.userId);
        socketPlayers.delete(socket.id);
        return;
      }
    }

    clearPlayerActivity(socket.userId);
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
  const today = new Date().toISOString().split('T')[0];

  // Snapshot daily/weekly stats BEFORE updating (for challenge completion detection)
  const preStats = {};
  for (const p of humanPlayers) {
    const { getDailyStats, getWeeklyStats } = require('./db');
    preStats[p.id] = {
      daily: getDailyStats(p.id, today),
      weekly: getWeeklyStats(p.id),
    };
  }

  if (humanPlayers.length >= 2) {
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
    const human = humanPlayers[0];
    recordGamePlayed(human.id, true);
  }

  game.ratingChanges = ratingChanges;

  game.newBadges = {};
  game.completedChallenges = {};
  for (const p of humanPlayers) {
    const earned = checkAndAwardBadges(p.id);
    if (earned.length > 0) {
      game.newBadges[p.id] = earned;
    }
    // Check which challenges were just completed this game
    const challenges = getNewlyCompletedChallenges(p.id, preStats[p.id].daily, preStats[p.id].weekly);
    if (challenges.length > 0) {
      game.completedChallenges[p.id] = challenges;
    }
  }
}

function advanceToNextActivePlayer(game) {
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
      state.completedChallenges = game.completedChallenges?.[p.id] || null;
      ps.emit('gameState', state);
    }
  }
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

// Track timeout timers per game so they can be cleared
const gameTimerHandles = new Map(); // gameId -> setTimeout handle

function deductTime(game) {
  if (!game.timers || !game.turnStartedAt) return;
  const elapsed = Date.now() - game.turnStartedAt;
  const idx = game.currentPlayerIndex;
  game.timers[idx] = Math.max(0, game.timers[idx] - elapsed);
  // Add increment only when player has ≤ 2 minutes remaining, cap at original time control
  if (game.timeIncrement && game.timers[idx] > 0 && game.timers[idx] <= 120000) {
    game.timers[idx] = Math.min(game.timers[idx] + game.timeIncrement, game.timeControl);
  }
}

function startTurnClock(game) {
  if (!game.timers) return;
  game.turnStartedAt = Date.now();

  // Clear any existing timeout for this game
  const existing = gameTimerHandles.get(game.id);
  if (existing) clearTimeout(existing);

  // Skip timer for CPU players
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (game.cpuPlayers?.includes(currentPlayer.id)) return;

  const idx = game.currentPlayerIndex;
  const remaining = game.timers[idx];
  if (remaining <= 0) return;

  // Schedule auto-timeout
  const handle = setTimeout(() => {
    gameTimerHandles.delete(game.id);
    if (game.phase === 'ended') return;
    const player = game.players[game.currentPlayerIndex];
    if (player.id !== currentPlayer.id) return; // turn already advanced
    // Time's up — player loses
    game.timers[idx] = 0;
    player.resigned = true;
    game.log.push(`${player.name} ran out of time!`);

    const activePlayers = game.players.filter(p => !p.resigned);
    if (activePlayers.length <= 1) {
      game.phase = 'ended';
      if (activePlayers.length === 1) {
        game.winner = activePlayers[0].id;
        game.log.push(`${activePlayers[0].name} wins!`);
      }
      applyRatings(game);
      broadcastGameState(game);
      setTimeout(() => {
        activeGames.delete(game.id);
        if (game.lobbyId) lobbies.delete(game.lobbyId);
        for (const p of game.players) {
          if (playerActivity.get(p.id)?.gameId === game.id) {
            playerActivity.delete(p.id);
          }
        }
        broadcastLobbyLists();
      }, 5000);
    } else {
      advanceToNextActivePlayer(game);
      game.turnNumber++;
      broadcastGameState(game);
      startTurnClock(game);
      // Check if next player is CPU
      const next = game.players[game.currentPlayerIndex];
      if (game.cpuPlayers?.includes(next.id) && !next.resigned) {
        setTimeout(() => processCpuTurn(game), 6000);
      }
    }
  }, remaining);
  gameTimerHandles.set(game.id, handle);
}

function finishTurn(game) {
  // Deduct elapsed time from current player before advancing
  deductTime(game);

  endTurn(game);

  if (game.phase === 'ended') {
    // Clear timer handle
    const handle = gameTimerHandles.get(game.id);
    if (handle) { clearTimeout(handle); gameTimerHandles.delete(game.id); }

    applyRatings(game);
    broadcastGameState(game);
    setTimeout(() => {
      activeGames.delete(game.id);
      if (game.lobbyId) lobbies.delete(game.lobbyId);
      // Clear activity for all players
      for (const p of game.players) {
        if (playerActivity.get(p.id)?.gameId === game.id) {
          playerActivity.delete(p.id);
        }
      }
      broadcastLobbyLists();
    }, 5000);
    return;
  }

  // Start clock for next player
  startTurnClock(game);

  broadcastGameState(game);

  const nextPlayer = game.players[game.currentPlayerIndex];
  if (game.phase !== 'ended' && !nextPlayer.resigned && game.cpuPlayers && game.cpuPlayers.includes(nextPlayer.id)) {
    setTimeout(() => processCpuTurn(game), 6000);
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
      break;
  }

  // CPU auto-returns excess chips if over 10
  if (result && result.needsReturn) {
    const player = game.players.find(p => p.id === cpuId);
    const total = Object.values(player.chips).reduce((s, v) => s + v, 0);
    const excess = total - 10;
    if (excess > 0) {
      // Return chips with the most quantity first (least valuable to strategy)
      const chipsToReturn = {};
      let remaining = excess;
      const sorted = Object.entries(player.chips)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]); // most chips first
      for (const [color, count] of sorted) {
        if (remaining <= 0) break;
        const ret = Math.min(count, remaining);
        chipsToReturn[color] = ret;
        remaining -= ret;
      }
      returnChips(game, cpuId, chipsToReturn);
    }
  }

  finishTurn(game);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Splendur server running on port ${PORT}`);
});
