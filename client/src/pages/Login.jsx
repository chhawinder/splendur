import { useState } from 'react';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const endpoint = isSignup ? '/api/signup' : '/api/login';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch {
      setError('Could not connect to server');
    }
  }

  function handleGuest() {
    onLogin({ id: null, username: 'Guest', rating: 1500 });
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Splendur</h1>
        <p className="subtitle">A gem trading card game</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <button className="btn-link" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? 'Already have an account? Login' : "New user? Sign Up"}
        </button>
        <button className="btn-secondary" onClick={handleGuest}>
          Play as Guest
        </button>
      </div>
    </div>
  );
}
