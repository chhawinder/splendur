const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { createUser, getUserByUsername, getUserById } = require('./db');
const { createGame, takeChips, returnChips, reserveCard, purchaseCard, endTurn, getPublicGameState } = require('./gameEngine');
const { cpuTurn } = require('./cpuPlayer');

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
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const existing = getUserByUsername(username);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const id = uuidv4();
    const hashed = await bcrypt.hash(password, 10);
    createUser(id, username, hashed);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, rating: 1500, wins: 0, losses: 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = getUserByUsername(username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, rating: user.rating, wins: user.wins, losses: user.losses } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
    // Allow guest players
    socket.userId = `guest_${uuidv4().slice(0, 8)}`;
    socket.username = `Guest_${Math.floor(Math.random() * 9999)}`;
    return next();
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
    io.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
  });

  socket.on('getLobbies', () => {
    socket.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
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
    io.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));
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

    io.emit('lobbiesList', Array.from(lobbies.values()).filter(l => !l.started));

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

  socket.on('disconnect', () => {
    playerSockets.delete(socket.userId);
    socketPlayers.delete(socket.id);
  });
});

function finishTurn(game) {
  endTurn(game);

  // Send updated state to all players
  for (const p of game.players) {
    const ps = playerSockets.get(p.id);
    if (ps) {
      ps.emit('gameState', getPublicGameState(game, p.id));
    }
  }

  // If next player is CPU, process their turn
  if (game.phase !== 'ended' && game.cpuPlayers && game.cpuPlayers.includes(game.players[game.currentPlayerIndex].id)) {
    setTimeout(() => processCpuTurn(game), 1200);
  }
}

function processCpuTurn(game) {
  const cpuId = game.players[game.currentPlayerIndex].id;
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
