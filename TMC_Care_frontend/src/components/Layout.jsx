import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useTheme } from '../hooks/useTheme';

export default function Layout({ route, navigate, onLogout, user, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // The dark-mode choice is saved on the account, so it follows the user to any device.
  const { setDark } = useTheme();
  const savedDark = user?.preferences?.darkMode;
  useEffect(() => {
    if (typeof savedDark === 'boolean') setDark(savedDark);
  }, [savedDark, setDark]);

  return (
    <div className="app-shell">
      <Sidebar
        route={route}
        navigate={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={onLogout}
        user={user}
      />
      <div className="app-main">
        <Topbar route={route} navigate={navigate} onMenuClick={() => setMobileOpen(true)} onLogout={onLogout} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
