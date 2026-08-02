import { useState } from 'react';
import { ShieldCheck, ChevronDown, LogOut, X } from 'lucide-react';
import { navSections, settingsItem } from '../data/navConfig';

export default function Sidebar({ route, navigate, mobileOpen, onCloseMobile, onLogout }) {
  const activeSectionIndex = navSections.findIndex((s) =>
    s.items.some((i) => i.path === route)
  );
  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    navSections.forEach((s, idx) => { initial[idx] = idx === activeSectionIndex; });
    return initial;
  });

  const toggleSection = (idx) => {
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const go = (path) => {
    navigate(path);
    onCloseMobile?.();
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-scrim" onClick={onCloseMobile} />}
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>
          <div>
            <p className="sidebar-brand-name">TMC-Care</p>
            <p className="sidebar-brand-sub">Admin Panel</p>
          </div>
          <button className="icon-btn sidebar-close" onClick={onCloseMobile} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, idx) => {
            const isSingle = section.items.length === 1 && !section.icon;
            if (isSingle) {
              const item = section.items[0];
              const Icon = item.icon;
              const active = route === item.path;
              return (
                <div className="nav-group" key={section.label}>
                  <p className="nav-group-label">{section.label}</p>
                  <button
                    className={`nav-link${active ? ' nav-link--active' : ''}`}
                    onClick={() => go(item.path)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            }
            const SectionIcon = section.icon;
            const open = !!openSections[idx];
            const sectionActive = section.items.some((i) => i.path === route);
            return (
              <div className="nav-group" key={section.label}>
                <button
                  className={`nav-section-toggle${sectionActive ? ' nav-section-toggle--active' : ''}`}
                  onClick={() => toggleSection(idx)}
                >
                  <SectionIcon size={18} />
                  <span>{section.label}</span>
                  <ChevronDown size={15} className={`chevron${open ? ' chevron--open' : ''}`} />
                </button>
                {open && (
                  <div className="nav-subitems">
                    {section.items.map((item) => {
                      const active = route === item.path;
                      return (
                        <button
                          key={item.path}
                          className={`nav-sublink${active ? ' nav-sublink--active' : ''}`}
                          onClick={() => go(item.path)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`nav-link${route === settingsItem.path ? ' nav-link--active' : ''}`}
            onClick={() => go(settingsItem.path)}
          >
            <settingsItem.icon size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-link nav-link--logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
