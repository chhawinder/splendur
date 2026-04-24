import { useState, useEffect } from 'react';

export default function Lobby({ socket, user, onGameStart }) {
  const [lobbies, setLobbies] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [gameName, setGameName] = useState('');

  useEffect(() => {
    socket.emit('getLobbies');
    socket.on('lobbiesList', setLobbies);
    socket.on('lobbyCreated', setCurrentLobby);
    socket.on('lobbyUpdated', setCurrentLobby);
    socket.on('gameStarted', ({ gameId }) => onGameStart(gameId));
    socket.on('error', ({ message }) => alert(message));

    return () => {
      socket.off('lobbiesList');
      socket.off('lobbyCreated');
      socket.off('lobbyUpdated');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, [socket, onGameStart]);

  function createLobby() {
    socket.emit('createLobby', { name: gameName || undefined, maxPlayers });
  }

  function joinLobby(lobbyId) {
    socket.emit('joinLobby', { lobbyId });
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (lobby) setCurrentLobby(lobby);
  }

  function addCPU() {
    if (currentLobby) socket.emit('addCPU', { lobbyId: currentLobby.id });
  }

  function startGame() {
    if (currentLobby) socket.emit('startGame', { lobbyId: currentLobby.id });
  }

  if (currentLobby) {
    return (
      <div className="lobby-page">
        <div className="lobby-room">
          <h2>{currentLobby.name}</h2>
          <p className="lobby-info">Players: {currentLobby.players.length}/{currentLobby.maxPlayers}</p>
          <div className="player-list">
            {currentLobby.players.map(p => (
              <div key={p.id} className={`player-slot ${p.isCPU ? 'cpu' : ''}`}>
                {p.isCPU ? '🤖' : '👤'} {p.name}
                {p.id === currentLobby.host && ' (Host)'}
              </div>
            ))}
          </div>
          {currentLobby.host === socket.userId && (
            <div className="lobby-actions">
              {currentLobby.players.length < currentLobby.maxPlayers && (
                <button className="btn-secondary" onClick={addCPU}>Add CPU</button>
              )}
              {currentLobby.players.length >= 2 && (
                <button className="btn-primary" onClick={startGame}>Start Game</button>
              )}
            </div>
          )}
          {currentLobby.host !== socket.userId && (
            <p className="waiting">Waiting for host to start...</p>
          )}
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
    </div>
  );
}
