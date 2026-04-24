import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login({ onLogin }) {

  async function handleGoogleSuccess(credentialResponse) {
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Login failed');
        return;
      }
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch {
      alert('Could not connect to server');
    }
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-page">
        <div className="login-card">
          <h1>Splendur</h1>
          <p className="subtitle">A gem trading card game</p>
          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => alert('Google Sign-In failed')}
              theme="filled_black"
              size="large"
              width="300"
              text="signin_with"
            />
          </div>
          <p className="login-note">Sign in with your Google account to play. One account per email.</p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
