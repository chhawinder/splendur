import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Profile from './pages/Profile';
import { getSocket, resetSocket } from './socket';
import { ThemeProvider, useTheme, THEMES } from './ThemeContext';
import './App.css';

function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div className="theme-switcher">
      {Object.values(themes).map(t => (
        <button
          key={t.name}
          className={`theme-btn ${theme === t.name ? 'active' : ''}`}
          onClick={() => setTheme(t.name)}
          title={t.label}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [gameId, setGameId] = useState(null);
  const [isSpectating, setIsSpectating] = useState(false);
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
    setIsSpectating(false);
    setPage('game');
  }

  function handleSpectate(gId) {
    setGameId(gId);
    setIsSpectating(true);
    setPage('game');
  }

  function handleLeaveGame() {
    if (socket && gameId) {
      if (isSpectating) {
        socket.emit('stopSpectating', { gameId });
        setIsSpectating(false);
      } else {
        socket.emit('leaveGame', { gameId });
      }
    }
    setGameId(null);
    setPage('lobby');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    resetSocket();
    setUser(null);
    setSocket(null);
    setPage('login');
  }

  // Generate shimmer particles once
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 1.5 + Math.random() * 2.5,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 15,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <div className="app">
      <div className="shimmer-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className="shimmer-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: `blur(${p.size > 3 ? 1 : 0}px)`,
              '--max-opacity': p.opacity,
            }}
          />
        ))}
      </div>
      {user && (
        <nav className="top-nav">
          <span className="nav-brand">Splendur</span>
          <div className="nav-right">
            <ThemeSwitcher />
            {page !== 'profile' && page !== 'login' && page !== 'game' && (
              <button className="btn-link" onClick={() => setPage('profile')}>Profile</button>
            )}
            {gameId && page !== 'game' && (
              <button className="btn-link" onClick={() => setPage('game')}>Back to Game</button>
            )}
            <span className="nav-user">{user.username}</span>
            <button className="btn-link" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}

      {page === 'login' && <Login onLogin={handleLogin} />}
      {page === 'lobby' && socket && <Lobby socket={socket} user={user} onGameStart={handleGameStart} onSpectate={handleSpectate} />}
      {page === 'game' && socket && gameId && (
        <Game
          socket={socket}
          gameId={gameId}
          userId={socketUserId || user?.id}
          isSpectating={isSpectating}
          onLeave={handleLeaveGame}
        />
      )}
      {page === 'profile' && <Profile onBack={() => setPage(gameId ? 'game' : 'lobby')} />}
    </div>
  );
}
