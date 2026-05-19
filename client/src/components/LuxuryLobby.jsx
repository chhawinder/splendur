import { useState } from 'react';
import { AVATARS, getAvatarSpriteStyle } from './AvatarSelect';
import { useTheme } from '../ThemeContext';
import Leaderboard from './Leaderboard';
import Achievements from './Achievements';
import HowToPlay from './HowToPlay';

const AVATAR_MAP = Object.fromEntries(AVATARS.map(a => [a.id, a]));
const CPU_AVATAR = 'knight'; // Fixed avatar for CPU players

// Room card images (gem/jewel/luxury photos — dark backgrounds)
export const ROOM_IMAGES = [
  // Original Google CDN gem images
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBPrtvXoPVTRmsk4x6R4Ms7NG-2yBQser7ZjPK4hsn_zflVUEgB-NoYRC3D5CdSwfqmUHVCzyID_Sfxht40oWkrh6QE1oP7vBiqoqfpz5tmRa8gWY3od-2aUc6Rvm1yAFBNEnDbFF__ES-KlpscZXpKI6jt28GDZpmdHF3OdHn_HJMLLRG8vU_5tvVGwW1vUKVVXG9QBaz-BkAfCf1mwn-pSW0yFal3Gj61bSwruIQuMpbh80pwK_uizkz0RxuT1QPmnKnpCFZZWxP_',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAP5zSuVCV7DBKPALv3RJp87-ZoBy6KkT_g8itNxxEfXNB5OSjzroka0w3L0fBoc7iS2xYixMGoD60cS6GfcYmzURiwZeYjpISjqVVrfRfdx66Rxj0kLQ4XGjN54KArfSUv9osO4Min6bhOp0FwnOWtIU2jut0dATEW5Ym1kmO0AH5h1CUF-JIkvlAGqfCb0CZCmhsw0MTX8iZHB873dbzy4mH7N0_ATg2PpM7rHckENvTjpMlKDoMQH8Q4B2Igqo8NqpqpHojFsVXt',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDOrSIFe2ufsUbI0_IV1m29ZcB-I4qDFyrE5S4MVP71rgh3IYVAgTvPq7d0KRaRDNWI9kYse6IMtIjbNofM2ZPBNr7FElGkLPRkLVBptBhxoPzxBv0D_5ZuKssKw5LLlTvJTbX5WjCB6i-mcCoy-VTU7anHFG2rNroHG6irRFFtXIQJTRvquuND40EE0IrPBpvUuXsot9aTg5UL9L5THFrhZStZopnGgkEr7JqKpTzfB8hv9XIAWkd988qTUApch1ImCNh9Jq0hsCTm',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCLJXOiyt2i_pEXQuz-pZa9umRXi5oYZaaO7yLCAkpHQA-x9FRFMQHwdPEgRIdOG9xIrhTw84E3naX-SjcD56LjGJbAd-DuBnDpLUDIhIVZjdspVviCOBkMp94QG3SRy7j69_6aVzfd9WUSqNg4FFiBSkyvUWSTQGEJyzcD7qKyDxYKNtVYm4zsS8bU4nK7RkBpdhSACQKG-YQ5Rf7ZfQZgaynHygCoNcxa0m0eUImF08mAFSE6MVfG8cdGQ8LGMQz7hga1EETDGBn_',
  // Pexels: Emerald gem on dark surface
  'https://images.pexels.com/photos/35451978/pexels-photo-35451978.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pexels: Raw emerald crystal on dark surface
  'https://images.pexels.com/photos/35451979/pexels-photo-35451979.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pexels: Gold coins on dark gradient
  'https://images.pexels.com/photos/8442342/pexels-photo-8442342.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pexels: Ancient gold coins, moody lighting
  'https://images.pexels.com/photos/7272207/pexels-photo-7272207.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pexels: Ruby/garnet stones on dark surface
  'https://images.pexels.com/photos/13307186/pexels-photo-13307186.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Pexels: Crystal quartz on dark background
  'https://images.pexels.com/photos/4028957/pexels-photo-4028957.jpeg?auto=compress&cs=tinysrgb&w=600',
];

function AvatarImage({ avatarId, size = 40, className = '' }) {
  const a = AVATAR_MAP[avatarId];
  if (!a) {
    return <div className={`luxury-avatar-placeholder ${className}`} style={{ width: size, height: size }}>?</div>;
  }
  return <div className={`luxury-avatar-img ${className}`} style={getAvatarSpriteStyle(avatarId, size)} />;
}

export default function LuxuryLobby({
  user, myId, lobbies, activeGames, myLobby, otherLobbies, isInAnyLobby,
  showCreateForm, setShowCreateForm, gameName, setGameName, maxPlayers, setMaxPlayers,
  targetScore, setTargetScore, timeControl, setTimeControl,
  createLobby, joinLobby, leaveLobby, startGame, addCPU, kickPlayer,
  changeMaxPlayers, spectateGame, onProfile, onLogout,
}) {
  const iAmHost = myLobby?.host === myId;
  const { theme, setTheme, themes } = useTheme();
  const [activeTab, setActiveTab] = useState('lobby');

  function renderPlayerAvatars(players) {
    return (
      <div className="lux-room-players">
        {players.map(p => (
          <div key={p.id} className="lux-room-player-chip">
            <AvatarImage avatarId={p.isCPU ? CPU_AVATAR : p.avatar} size={32} />
            <span className="lux-room-player-name">{p.name}</span>
            {p.id === myId && <span className="lux-you-dot" />}
          </div>
        ))}
        {myLobby && myLobby.id === (players[0] && lobbies.find(l => l.players.includes(players[0])))?.id ? null : null}
      </div>
    );
  }

  return (
    <div className="luxury-lobby">
      {/* Sidebar */}
      <aside className="lux-sidebar">
        <div className="lux-sidebar-brand">SPLENDUR</div>

        <div className="lux-sidebar-profile">
          <AvatarImage avatarId={user.avatar} size={56} className="lux-sidebar-avatar" />
          <div>
            <div className="lux-sidebar-name">{AVATAR_MAP[user.avatar]?.label || user.username}</div>
            <div className="lux-sidebar-meta">
              <span className="lux-elo-badge">{user.rating || 1500} ELO</span>
            </div>
          </div>
        </div>

        <nav className="lux-sidebar-nav">
          <a className={`lux-nav-item ${activeTab === 'lobby' ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); setActiveTab('lobby'); }}>
            <span className="lux-nav-icon">&#9672;</span> LOBBY
          </a>
          <a className="lux-nav-item" href="#" onClick={e => { e.preventDefault(); onProfile?.(); }}>
            <span className="lux-nav-icon">&#9733;</span> PROFILE
          </a>
          <a className={`lux-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); setActiveTab('leaderboard'); }}>
            <span className="lux-nav-icon">&#9814;</span> LEADERBOARD
          </a>
          <a className={`lux-nav-item ${activeTab === 'achievements' ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); setActiveTab('achievements'); }}>
            <span className="lux-nav-icon">&#127942;</span> ACHIEVEMENTS
          </a>
          <a className={`lux-nav-item ${activeTab === 'howtoplay' ? 'active' : ''}`} href="#" onClick={e => { e.preventDefault(); setActiveTab('howtoplay'); }}>
            <span className="lux-nav-icon">&#9432;</span> HOW TO PLAY
          </a>
          <a className="lux-nav-item" href="#" onClick={e => { e.preventDefault(); onLogout?.(); }} style={{ marginTop: 'auto' }}>
            <span className="lux-nav-icon">&#x2190;</span> LOGOUT
          </a>
        </nav>

        {/* Theme switcher */}
        <div className="lux-sidebar-themes">
          <span className="lux-themes-label">THEME</span>
          <div className="lux-themes-row">
            {Object.values(themes).map(t => (
              <button
                key={t.name}
                className={`lux-theme-btn ${theme === t.name ? 'lux-theme-active' : ''}`}
                onClick={() => setTheme(t.name)}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lux-main">
        {activeTab === 'leaderboard' && <Leaderboard user={user} />}
        {activeTab === 'achievements' && <Achievements user={user} />}
        {activeTab === 'howtoplay' && <HowToPlay />}
        {activeTab === 'lobby' && <>
        {/* Stats bar */}
        <header className="lux-header">
          <div className="lux-header-stats">
            <div className="lux-stat">
              <span className="lux-stat-label">ACTIVE HEISTS</span>
              <span className="lux-stat-value">{activeGames.length}</span>
            </div>
            <div className="lux-stat-divider" />
            <div className="lux-stat">
              <span className="lux-stat-label">TOTAL WINS</span>
              <span className="lux-stat-value lux-gold">{user.wins || 0}</span>
            </div>
          </div>
          <div className="lux-header-right">
            <div className="lux-diamond-badge">
              <span>&#128142;</span> <span className="lux-diamond-count">0</span>
            </div>
          </div>
        </header>

        {/* Hero banner */}
        <section className="lux-hero">
          <div className="lux-hero-overlay" />
          <div className="lux-hero-content">
            <h2 className="lux-hero-title">Mastermind a New Heist</h2>
            <p className="lux-hero-desc">Establish your own table, set the stakes, and invite the world's most skilled traders to your private gallery.</p>
            {!isInAnyLobby ? (
              <button className="lux-btn-gold" onClick={() => setShowCreateForm(v => !v)}>
                {showCreateForm ? 'CANCEL' : 'CREATE PRIVATE GAME'}
              </button>
            ) : (
              <span className="lux-hero-hint">You are in a room</span>
            )}
          </div>
        </section>

        {/* Create form */}
        {showCreateForm && !isInAnyLobby && (
          <div className="lux-create-form">
            <input type="text" placeholder="Room name (optional)" value={gameName} onChange={e => setGameName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createLobby()} />
            <select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))}>
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
            <select value={targetScore} onChange={e => setTargetScore(Number(e.target.value))}>
              <option value={15}>15 Points</option>
              <option value={21}>21 Points</option>
            </select>
            <select value={timeControl} onChange={e => setTimeControl(Number(e.target.value))}>
              <option value={0}>No Timer</option>
              <option value={300000}>5m + 15s</option>
              <option value={600000}>10m + 10s</option>
            </select>
            <button className="lux-btn-gold" onClick={createLobby}>CREATE</button>
          </div>
        )}

        {/* Live Spectate */}
        {activeGames.length > 0 && (
          <section className="lux-section">
            <div className="lux-section-header">
              <div>
                <h3 className="lux-section-title">Live Spectate</h3>
                <p className="lux-section-sub">Watch the elite compete in real-time</p>
              </div>
            </div>
            <div className="lux-spectate-scroll">
              {activeGames.map(game => {
                const half = Math.ceil(game.players.length / 2);
                const leftTeam = game.players.slice(0, half);
                const rightTeam = game.players.slice(half);
                return (
                  <div key={game.id} className="lux-spectate-card" onClick={() => spectateGame(game.id)}>
                    <div className="lux-spectate-top">
                      <div className="lux-live-badge"><span className="lux-live-dot" /> LIVE</div>
                    </div>
                    <div className="lux-spectate-versus">
                      <div className="lux-versus-side">
                        {leftTeam.map((p, i) => (
                          <div key={p.id || i} className="lux-versus-player">
                            <AvatarImage avatarId={p.isCPU ? CPU_AVATAR : p.avatar} size={56} />
                            <span className="lux-versus-name">{p.name}</span>
                            <span className="lux-versus-pts">{p.points} pts</span>
                          </div>
                        ))}
                      </div>
                      <span className="lux-vs-label">VS</span>
                      <div className="lux-versus-side">
                        {rightTeam.map((p, i) => (
                          <div key={p.id || i} className="lux-versus-player">
                            <AvatarImage avatarId={p.isCPU ? CPU_AVATAR : p.avatar} size={56} />
                            <span className="lux-versus-name">{p.name}</span>
                            <span className="lux-versus-pts">{p.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lux-spectate-footer">
                      <span>Turn {game.turnNumber}</span>
                      <span className="lux-play-icon">&#9655;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Available Rooms */}
        <section className="lux-section">
          <div className="lux-section-header">
            <h3 className="lux-section-title">Available Rooms</h3>
            <div className="lux-section-line" />
          </div>

          {(myLobby || otherLobbies.length > 0) ? (
            <div className="lux-rooms-grid">
              {myLobby && (
                <RoomCard
                  lobby={myLobby} isMyRoom myId={myId} iAmHost={iAmHost}
                  startGame={startGame} leaveLobby={leaveLobby} addCPU={addCPU}
                  kickPlayer={kickPlayer} changeMaxPlayers={changeMaxPlayers}
                />
              )}
              {otherLobbies.map((lobby) => (
                <RoomCard
                  key={lobby.id} lobby={lobby} myId={myId}
                  joinLobby={joinLobby} isInAnyLobby={isInAnyLobby}
                />
              ))}
            </div>
          ) : (
            <div className="lux-no-rooms">
              <p>No games available right now.</p>
              <p className="lux-no-rooms-hint">Create a game and invite others to play!</p>
            </div>
          )}
        </section>
        </>}
      </main>
    </div>
  );
}

function RoomCard({ lobby, isMyRoom, myId, iAmHost, startGame, leaveLobby, addCPU, kickPlayer, joinLobby, isInAnyLobby, changeMaxPlayers }) {
  const bgIndex = (lobby.roomImage != null) ? lobby.roomImage % ROOM_IMAGES.length : 0;
  const hostPlayer = lobby.players.find(p => p.id === lobby.host);
  const roomTitle = lobby.name || `${hostPlayer?.name || 'Unknown'}'s Heist`;
  const emptySlots = lobby.maxPlayers - lobby.players.length;
  const canJoin = !isMyRoom && !isInAnyLobby && lobby.players.length < lobby.maxPlayers;

  return (
    <div className={`lux-room-card ${isMyRoom ? 'lux-my-room' : ''}`}>
      {/* Left: Image */}
      <div className="lux-room-img" style={{ backgroundImage: `url(${ROOM_IMAGES[bgIndex]})` }}>
        {isMyRoom && <span className="lux-room-tag">YOUR ROOM</span>}
        <div className="lux-room-meta-badges">
          <span className="lux-meta-badge">{lobby.players.length}/{lobby.maxPlayers}</span>
          <span className="lux-meta-badge">{lobby.targetScore || 15} pts</span>
          {lobby.timeControl ? (
            <span className="lux-meta-badge">{lobby.timeControl / 60000}m + {lobby.timeControl <= 300000 ? '15' : '10'}s</span>
          ) : (
            <span className="lux-meta-badge">No Timer</span>
          )}
        </div>
      </div>

      {/* Right: Content */}
      <div className="lux-room-body">
        <h4 className="lux-room-title">{roomTitle}</h4>

        {/* Player avatars */}
        <div className="lux-room-players">
          {lobby.players.map(p => (
            <div key={p.id} className="lux-room-player-chip">
              <AvatarImage avatarId={p.isCPU ? CPU_AVATAR : p.avatar} size={40} />
              <div className="lux-room-player-info">
                <span className="lux-room-player-name">
                  {p.name}
                  {p.id === lobby.host && <span className="lux-host-tag">HOST</span>}
                </span>
                {p.rating != null && <span className="lux-room-player-elo">{p.rating}</span>}
              </div>
              {iAmHost && p.id !== lobby.host && (
                <button className="lux-kick-btn" onClick={() => kickPlayer(lobby.id, p.id)}>&times;</button>
              )}
            </div>
          ))}
          {emptySlots > 0 && isMyRoom && iAmHost && (
            <div className="lux-room-player-chip lux-add-cpu" onClick={() => addCPU(lobby.id)}>
              <span>+ Add CPU</span>
            </div>
          )}
          {emptySlots > 0 && Array.from({ length: isMyRoom && iAmHost ? emptySlots - 1 : emptySlots }, (_, i) => (
            <div key={`empty-${i}`} className="lux-room-player-chip lux-empty-slot">
              <span>?</span> <span>Waiting...</span>
            </div>
          ))}
        </div>

        {/* Room size controls for host */}
        {isMyRoom && iAmHost && (
          <div className="lux-room-size">
            <button onClick={() => changeMaxPlayers(lobby.id, -1)} disabled={lobby.maxPlayers <= lobby.players.length || lobby.maxPlayers <= 2}>-</button>
            <span>{lobby.maxPlayers} max</span>
            <button onClick={() => changeMaxPlayers(lobby.id, 1)} disabled={lobby.maxPlayers >= 4}>+</button>
          </div>
        )}

        {/* Actions */}
        <div className="lux-room-actions">
          {isMyRoom && iAmHost && (
            <>
              {lobby.players.length >= 2 && (
                <button className="lux-btn-gold lux-btn-sm" onClick={() => startGame(lobby.id)}>START HEIST</button>
              )}
              <button className="lux-btn-danger lux-btn-sm" onClick={() => leaveLobby(lobby.id)}>CLOSE</button>
            </>
          )}
          {isMyRoom && !iAmHost && (
            <button className="lux-btn-danger lux-btn-sm" onClick={() => leaveLobby(lobby.id)}>LEAVE</button>
          )}
          {canJoin && (
            <button className="lux-btn-gold lux-btn-sm" onClick={() => joinLobby(lobby.id)}>JOIN HEIST</button>
          )}
        </div>
      </div>
    </div>
  );
}
