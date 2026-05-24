import { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Profile from './pages/Profile';
import AvatarSelect, { AVATARS } from './components/AvatarSelect';
import { getSocket, resetSocket } from './socket';
import { ThemeProvider, useTheme, THEMES } from './ThemeContext';
import './App.css';

const AVATAR_IDS = new Set(AVATARS.map(a => a.id));

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

  const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

  // Fetch fresh user data (wins, etc.) — force re-login if user no longer exists
  function refreshUser() {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 404 || r.status === 401) {
          // User no longer exists (DB wiped) or token invalid — force re-login
          localStorage.removeItem('token');
          resetSocket();
          setUser(null);
          setSocket(null);
          setPage('login');
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(data => { if (data) setUser(data.user); })
      .catch(() => {});
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => handleLogin(data.user))
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  function connectSocket(userData) {
    resetSocket();
    const s = getSocket();
    s.on('connected', ({ userId }) => {
      setSocketUserId(userId);
      s.userId = userId;
      s.emit('checkActiveGame');

      // Auto-join lobby from ?join= URL parameter
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get('join');
      if (joinId) {
        s.emit('joinLobby', { lobbyId: joinId });
        // Clean URL without reloading the page
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
    s.once('activeGameFound', ({ gameId: gId, role }) => {
      if (gId) {
        setGameId(gId);
        setIsSpectating(role === 'spectating');
        setPage('game');
      }
    });
    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      // If auth fails, force re-login
      if (err.message === 'Authentication required' || err.message === 'Invalid token') {
        localStorage.removeItem('token');
        resetSocket();
        setUser(null);
        setSocket(null);
        setPage('login');
      }
    });
    setSocket(s);
  }

  function handleLogin(userData) {
    setUser(userData);
    // If user hasn't picked a game avatar yet, show avatar selection
    if (!userData.avatar || !AVATAR_IDS.has(userData.avatar)) {
      setPage('avatar');
      return;
    }
    connectSocket(userData);
    setPage('lobby');
  }

  function handleAvatarSelected(updatedUser) {
    setUser(updatedUser);
    connectSocket(updatedUser);
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

  const handleLeaveGame = useCallback(() => {
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
    refreshUser(); // Fetch fresh wins count
  }, [socket, gameId, isSpectating]);

  function handleLogout() {
    localStorage.removeItem('token');
    resetSocket();
    setUser(null);
    setSocket(null);
    setPage('login');
  }

  // Generate shimmer particles once
  const particles = Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    duration: 10 + Math.random() * 15,
    delay: Math.random() * 20,
    opacity: 0.25 + Math.random() * 0.35,
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
      {user && page === 'game' && (
        <nav className="top-nav">
          <span className="nav-brand">Splendur</span>
          <div className="nav-right">
            <ThemeSwitcher />
            <span className="nav-user">{user.username}</span>
            <button className="btn-link" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      )}

      {page === 'login' && <Login onLogin={handleLogin} />}
      {page === 'avatar' && <AvatarSelect user={user} onSelect={handleAvatarSelected} />}
      {page === 'lobby' && socket && <Lobby socket={socket} user={user} onGameStart={handleGameStart} onSpectate={handleSpectate} onProfile={() => setPage('profile')} onLogout={handleLogout} />}
      {page === 'game' && socket && gameId && (
        <Game
          socket={socket}
          gameId={gameId}
          userId={socketUserId || user?.id}
          isSpectating={isSpectating}
          onLeave={handleLeaveGame}
        />
      )}
      {page === 'profile' && <Profile onBack={() => setPage(gameId ? 'game' : 'lobby')} onUserUpdate={updated => setUser(updated)} />}
    </div>
  );
}
