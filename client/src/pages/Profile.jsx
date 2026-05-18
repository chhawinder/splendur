import { useState, useEffect } from 'react';
import LuxuryProfile from '../components/LuxuryProfile';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function Profile({ onBack, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!profile) return <div className="loading">Could not load profile</div>;

  return <LuxuryProfile profile={profile} setProfile={setProfile} onBack={onBack} onUserUpdate={onUserUpdate} />;
}
