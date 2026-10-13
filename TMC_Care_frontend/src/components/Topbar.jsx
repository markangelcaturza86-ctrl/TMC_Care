import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, User, LogOut } from 'lucide-react';
import { findNavLabel } from '../data/navConfig';
import { api } from '../api/client';

export default function Topbar({ route, navigate, onMenuClick, onLogout }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [seenAt, setSeenAt] = useState(() => Number(localStorage.getItem('adminNotifSeenAt') || 0));
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    api.get('/me').then(setCurrentUser).catch(() => {});
  }, []);

  // New incident reports / requests / replies from the mobile app.
  // Refreshed every minute and each time the bell is opened.
  const loadNotifications = () => {
    api.get('/notifications').then(setNotifications).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 60000);
    return () => clearInterval(timer);
  }, []);

  const isUnread = (n) => new Date(n.createdAt).getTime() > seenAt;
  const unreadCount = notifications.filter(isUnread).length;

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem('adminNotifSeenAt', String(now));
    setSeenAt(now);
  };

  const openNotification = (n) => {
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

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
          <button
            className="icon-btn notif-btn"
            onClick={() => {
              if (!notifOpen) loadNotifications();
              setNotifOpen((o) => !o);
            }}
            aria-label="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="notif-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown dropdown--wide notif-dropdown">
              <div className="notif-head">
                <p className="dropdown-title" style={{ margin: 0 }}>Notifications</p>
                {unreadCount > 0 && (
                  <button type="button" className="link-btn" onClick={markAllRead}>Mark all as read</button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="dropdown-row-sub" style={{ padding: '8px 4px' }}>No notifications yet.</p>
              ) : (
                <div className="notif-list">
                  {notifications.map((n) => (
                    <button
                      type="button"
                      className={`dropdown-row notif-row${isUnread(n) ? ' notif-row--unread' : ''}`}
                      key={n.id}
                      onClick={() => openNotification(n)}
                    >
                      <div className={`dot dot--${n.color}`} />
                      <div>
                        <p className="dropdown-row-title">{n.title}</p>
                        <p className="dropdown-row-sub">{n.detail} &middot; {n.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
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