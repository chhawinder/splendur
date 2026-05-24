import { useState, useEffect, useRef } from 'react';
import LuxuryLobby from '../components/LuxuryLobby';
import { playPlayerJoined } from '../sounds';

export default function Lobby({ socket, user, onGameStart, onSpectate, onProfile, onLogout }) {
  const [lobbies, setLobbies] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [currentLobbyId, setCurrentLobbyId] = useState(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [targetScore, setTargetScore] = useState(15);
  const [timeControl, setTimeControl] = useState(0); // 0 = no timer, ms value otherwise
  const [gameName, setGameName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [mySocketId, setMySocketId] = useState(socket.userId || user?.id || null);
  const prevMyLobbyPlayers = useRef(0);

  const myId = mySocketId || user?.id;

  useEffect(() => {
    socket.on('connected', ({ userId }) => {
      setMySocketId(userId);
      socket.userId = userId;
    });
    if (socket.userId) setMySocketId(socket.userId);
    socket.emit('getLobbies');

    socket.on('lobbiesList', (list) => {
      setLobbies(list);
      setCurrentLobbyId(prev => {
        if (prev) return prev;
        const myLobby = list.find(l => l.players.some(p => p.id === (socket.userId || user?.id)));
        if (myLobby) {
          socket.join?.(`lobby_${myLobby.id}`);
          return myLobby.id;
        }
        return null;
      });
    });
    socket.on('activeGamesList', setActiveGames);
    socket.on('lobbyCreated', (lobby) => {
      prevMyLobbyPlayers.current = lobby.players?.length || 1;
      setCurrentLobbyId(lobby.id);
    });
    socket.on('lobbyUpdated', (lobby) => {
      // Play sound when someone joins YOUR room
      setCurrentLobbyId(curId => {
        if (curId && lobby.id === curId && lobby.players.length > prevMyLobbyPlayers.current) {
          playPlayerJoined();
        }
        if (curId === lobby.id) prevMyLobbyPlayers.current = lobby.players.length;
        return curId;
      });
      setLobbies(prev => {
        const idx = prev.findIndex(l => l.id === lobby.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = lobby;
          return next;
        }
        return [...prev, lobby];
      });
    });
    socket.on('gameStarted', ({ gameId }) => onGameStart(gameId));
    socket.on('error', ({ message }) => alert(message));
    socket.on('lobbyLeft', () => setCurrentLobbyId(null));
    socket.on('lobbyClosed', () => {
      setCurrentLobbyId(null);
      socket.emit('getLobbies');
    });
    socket.on('lobbyKicked', () => {
      setCurrentLobbyId(null);
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
    socket.emit('createLobby', {
      name: gameName || undefined,
      maxPlayers,
      targetScore,
      timeControl: timeControl || null,
    });
    setShowCreateForm(false);
    setGameName('');
  }

  function joinLobby(lobbyId) {
    socket.emit('joinLobby', { lobbyId });
    setCurrentLobbyId(lobbyId);
  }

  function addCPU(lobbyId) { socket.emit('addCPU', { lobbyId }); }
  function kickPlayer(lobbyId, playerId) { socket.emit('kickPlayer', { lobbyId, playerId }); }
  function startGame(lobbyId) { socket.emit('startGame', { lobbyId }); }

  function leaveLobby(lobbyId) {
    socket.emit('leaveLobby', { lobbyId });
    setCurrentLobbyId(null);
  }

  function spectateGame(gameId) {
    socket.emit('spectateGame', { gameId });
    onSpectate(gameId);
  }

  function changeMaxPlayers(lobbyId, delta) {
    socket.emit('changeMaxPlayers', { lobbyId, delta });
  }

  const myLobby = lobbies.find(l => l.id === currentLobbyId) || lobbies.find(l => l.players.some(p => p.id === myId));
  const isInAnyLobby = !!myLobby;
  const otherLobbies = lobbies.filter(l => l.id !== myLobby?.id);

  return (
    <LuxuryLobby
      user={user} myId={myId} lobbies={lobbies} activeGames={activeGames}
      myLobby={myLobby} otherLobbies={otherLobbies} isInAnyLobby={isInAnyLobby}
      showCreateForm={showCreateForm} setShowCreateForm={setShowCreateForm}
      gameName={gameName} setGameName={setGameName}
      maxPlayers={maxPlayers} setMaxPlayers={setMaxPlayers}
      targetScore={targetScore} setTargetScore={setTargetScore}
      timeControl={timeControl} setTimeControl={setTimeControl}
      createLobby={createLobby} joinLobby={joinLobby} leaveLobby={leaveLobby}
      startGame={startGame} addCPU={addCPU} kickPlayer={kickPlayer}
      changeMaxPlayers={changeMaxPlayers} spectateGame={spectateGame}
      onProfile={onProfile} onLogout={onLogout}
    />
  );
}
