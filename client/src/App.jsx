import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Profile from './pages/Profile';
import { getSocket, resetSocket } from './socket';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [gameId, setGameId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketUserId, setSocketUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
      fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => handleLogin(data.user))
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    resetSocket();
    const s = getSocket();
    s.on('connected', ({ userId }) => {
      setSocketUserId(userId);
      s.userId = userId;
    });
    setSocket(s);
    setPage('lobby');
  }

  function handleGameStart(gId) {
    setGameId(gId);
    setPage('game');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    resetSocket();
    setUser(null);
    setSocket(null);
    setPage('login');
  }

  return (
    <div className="app">
      {user && (
        <nav className="top-nav">
          <span className="nav-brand">Splendur</span>
          <div className="nav-right">
            {page === 'game' && (
              <button className="btn-link" onClick={() => setPage('lobby')}>Back to Lobby</button>
            )}
            {page !== 'profile' && (
              <button className="btn-link" onClick={() => setPage('profile')}>Profile</button>
            )}
            <span className="nav-user">{user.username}</span>
            <button className="btn-link" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}

      {page === 'login' && <Login onLogin={handleLogin} />}
      {page === 'lobby' && socket && <Lobby socket={socket} user={user} onGameStart={handleGameStart} />}
      {page === 'game' && socket && (
        <Game socket={socket} gameId={gameId} userId={socketUserId || user?.id} />
      )}
      {page === 'profile' && <Profile onBack={() => setPage('lobby')} />}
    </div>
  );
}
