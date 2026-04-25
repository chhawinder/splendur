import { useState, useEffect } from 'react';

export default function Lobby({ socket, user, onGameStart, onSpectate }) {
  const [lobbies, setLobbies] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [targetScore, setTargetScore] = useState(15);
  const [gameName, setGameName] = useState('');
  const [mySocketId, setMySocketId] = useState(socket.userId || user?.id || null);

  useEffect(() => {
    socket.on('connected', ({ userId }) => {
      setMySocketId(userId);
      socket.userId = userId;
    });
    if (socket.userId) setMySocketId(socket.userId);
    socket.emit('getLobbies');
    socket.on('lobbiesList', setLobbies);
    socket.on('activeGamesList', setActiveGames);
    socket.on('lobbyCreated', setCurrentLobby);
    socket.on('lobbyUpdated', setCurrentLobby);
    socket.on('gameStarted', ({ gameId }) => onGameStart(gameId));
    socket.on('error', ({ message }) => alert(message));
    socket.on('lobbyLeft', () => setCurrentLobby(null));
    socket.on('lobbyClosed', () => {
      setCurrentLobby(null);
      socket.emit('getLobbies');
    });
    socket.on('lobbyKicked', () => {
      setCurrentLobby(null);
      socket.emit('getLobbies');
    });

    return () => {
      socket.off('lobbiesList');
      socket.off('activeGamesList');
      socket.off('lobbyCreated');
      socket.off('lobbyUpdated');
      socket.off('gameStarted');
      socket.off('error');
      socket.off('lobbyLeft');
      socket.off('lobbyClosed');
      socket.off('lobbyKicked');
      socket.off('connected');
    };
  }, [socket, onGameStart]);

  function createLobby() {
    socket.emit('createLobby', { name: gameName || undefined, maxPlayers, targetScore });
  }

  function joinLobby(lobbyId) {
    socket.emit('joinLobby', { lobbyId });
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (lobby) setCurrentLobby(lobby);
  }

  function addCPU() {
    if (currentLobby) socket.emit('addCPU', { lobbyId: currentLobby.id });
  }

  function kickPlayer(playerId) {
    if (currentLobby) socket.emit('kickPlayer', { lobbyId: currentLobby.id, playerId });
  }

  function startGame() {
    if (currentLobby) socket.emit('startGame', { lobbyId: currentLobby.id });
  }

  function leaveLobby() {
    if (currentLobby) {
      socket.emit('leaveLobby', { lobbyId: currentLobby.id });
      setCurrentLobby(null);
    }
  }

  function spectateGame(gameId) {
    socket.emit('spectateGame', { gameId });
    onSpectate(gameId);
  }

  if (currentLobby) {
    return (
      <div className="lobby-page">
        <div className="lobby-room">
          <h2>{currentLobby.name}</h2>
          <p className="lobby-info">Players: {currentLobby.players.length}/{currentLobby.maxPlayers} &middot; Target: {currentLobby.targetScore || 15} pts</p>
          <div className="player-list">
            {currentLobby.players.map(p => {
              const isHost = p.id === currentLobby.host;
              const iAmHost = currentLobby.host === mySocketId || currentLobby.host === user?.id;
              return (
                <div key={p.id} className={`player-slot ${p.isCPU ? 'cpu' : ''}`}>
                  <div className="player-slot-info">
                    {p.isCPU ? '🤖' : '👤'} {p.name}
                    {isHost && <span className="host-badge">Host</span>}
                  </div>
                  {iAmHost && !isHost && (
                    <button className="btn-kick" onClick={() => kickPlayer(p.id)} title="Remove player">
                      &times;
                    </button>
                  )}
                </div>
              );
            })}
            {(currentLobby.host === mySocketId || currentLobby.host === user?.id) &&
              currentLobby.players.length < currentLobby.maxPlayers && (
              <div className="player-slot add-slot" onClick={addCPU}>
                <span className="add-icon">+</span>
                <span>Add CPU</span>
              </div>
            )}
          </div>
          <div className="lobby-actions">
            {(currentLobby.host === mySocketId || currentLobby.host === user?.id) ? (
              <>
                {currentLobby.players.length >= 2 && (
                  <button className="btn-primary" onClick={startGame}>Start</button>
                )}
              </>
            ) : (
              <p className="waiting">Waiting for host to start...</p>
            )}
            <button className="btn-danger" onClick={leaveLobby}>Leave</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h2>Game Lobby</h2>
        <p>Welcome, {user.username} (Rating: {user.rating})</p>
      </div>

      <div className="create-game">
        <h3>Create New Game</h3>
        <div className="create-form">
          <input
            type="text"
            placeholder="Game name (optional)"
            value={gameName}
            onChange={e => setGameName(e.target.value)}
          />
          <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}>
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
          </select>
          <select value={targetScore} onChange={e => setTargetScore(Number(e.target.value))}>
            <option value={15}>15 Points</option>
            <option value={21}>21 Points</option>
          </select>
          <button className="btn-primary" onClick={createLobby}>Create</button>
        </div>
      </div>

      <div className="available-games">
        <h3>Available Games</h3>
        {lobbies.length === 0 ? (
          <p className="no-games">No games available. Create one!</p>
        ) : (
          lobbies.map(lobby => (
            <div key={lobby.id} className="lobby-item">
              <div>
                <strong>{lobby.name}</strong>
                <span className="player-count">{lobby.players.length}/{lobby.maxPlayers} players</span>
              </div>
              <button className="btn-secondary" onClick={() => joinLobby(lobby.id)}>Join</button>
            </div>
          ))
        )}
      </div>

      {activeGames.length > 0 && (
        <div className="active-games">
          <h3>Live Games — Watch</h3>
          {activeGames.map(game => (
            <div key={game.id} className="lobby-item live-game-item">
              <div>
                <strong>{game.players.map(p => p.name).join(' vs ')}</strong>
                <span className="game-status">
                  Turn {game.turnNumber} — {game.players.map(p => `${p.name}: ${p.points}pts`).join(', ')}
                </span>
              </div>
              <button className="btn-spectate" onClick={() => spectateGame(game.id)}>Watch</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
