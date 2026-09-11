import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { findNavLabel } from '../data/navConfig';
import { api } from '../api/client';

export default function Topbar({ route, navigate, onMenuClick, onLogout }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    api.get('/me').then(setCurrentUser).catch(() => {});
    api.get('/audit-logs').then(setRecentActivities).catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const title = findNavLabel(route);

  if (!currentUser) return null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn topbar-menu" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h2 className="topbar-title">{title}</h2>
      </div>

      <div className="topbar-right">
        <div className="topbar-item" ref={notifRef}>
          <button className="icon-btn notif-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
            <Bell size={19} />
            {recentActivities.length > 0 && <span className="notif-dot">{recentActivities.length}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown dropdown--wide">
              <p className="dropdown-title">Notifications</p>
              {recentActivities.length === 0 ? (
                <p className="dropdown-row-sub" style={{ padding: '8px 4px' }}>No recent activity.</p>
              ) : (
                recentActivities.map((a) => (
                  <div className="dropdown-row" key={a.id}>
                    <div className={`dot dot--${a.color}`} />
                    <div>
                      <p className="dropdown-row-title">{a.title}</p>
                      <p className="dropdown-row-sub">{a.detail} &middot; {a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="topbar-item" ref={userRef}>
          <button className="user-chip" onClick={() => setUserOpen((o) => !o)}>
            <div className="avatar" style={{ backgroundColor: currentUser.avatarColor }}>
              {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="user-chip-text">
              <span className="user-chip-name">{currentUser.name}</span>
              <span className="user-chip-role">{currentUser.role}</span>
            </div>
            <ChevronDown size={15} />
          </button>
          {userOpen && (
            <div className="dropdown">
              <button
                className="dropdown-action"
                onClick={() => { navigate('/settings'); setUserOpen(false); }}
              >
                <User size={16} /> View Profile
              </button>
              <button className="dropdown-action dropdown-action--danger" onClick={onLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}