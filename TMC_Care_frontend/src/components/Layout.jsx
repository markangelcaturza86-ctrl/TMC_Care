import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ route, navigate, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        route={route}
        navigate={navigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={onLogout}
      />
      <div className="app-main">
        <Topbar route={route} navigate={navigate} onMenuClick={() => setMobileOpen(true)} onLogout={onLogout} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
