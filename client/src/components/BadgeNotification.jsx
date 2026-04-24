import { useState, useEffect } from 'react';

export default function BadgeNotification({ badges, onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!badges || badges.length === 0) return;
    const timer = setTimeout(() => {
      if (currentIndex < badges.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setVisible(false);
        setTimeout(onDone, 300);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentIndex, badges, onDone]);

  if (!badges || badges.length === 0 || !visible) return null;

  const badge = badges[currentIndex];

  return (
    <div className="badge-notification" onClick={() => {
      if (currentIndex < badges.length - 1) setCurrentIndex(currentIndex + 1);
      else { setVisible(false); onDone(); }
    }}>
      <div className="badge-notif-content">
        <div className="badge-notif-icon">{badge.icon}</div>
        <div className="badge-notif-text">
          <span className="badge-notif-label">Badge Earned!</span>
          <span className="badge-notif-name">{badge.name}</span>
          <span className="badge-notif-desc">{badge.desc}</span>
        </div>
      </div>
      {badges.length > 1 && (
        <div className="badge-notif-counter">{currentIndex + 1}/{badges.length}</div>
      )}
    </div>
  );
}
