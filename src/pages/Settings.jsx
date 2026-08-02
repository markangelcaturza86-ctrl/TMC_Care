import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { currentUser } from '../data/mockData';
import { useToast } from '../components/Toast';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`toggle${checked ? ' toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function Settings() {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [notifs, setNotifs] = useState({ email: true, newRequests: true, verifications: true, digest: false });
  const showToast = useToast();

  const saveProfile = (e) => {
    e.preventDefault();
    showToast('Profile updated.', 'success');
  };

  return (
    <div className="page-stack">
      <PageHeader title="Settings" subtitle="Manage your account and system preferences." />

      <div className="settings-grid">
        <form className="panel" onSubmit={saveProfile}>
          <div className="panel-header"><h3>Profile</h3></div>
          <div className="settings-body">
            <div className="profile-head" style={{ marginBottom: 18 }}>
              <div className="avatar avatar--lg" style={{ backgroundColor: currentUser.avatarColor }}>
                {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="profile-name">{name}</p>
                <p className="profile-sub">{currentUser.role}</p>
              </div>
            </div>
            <label className="field"><span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field"><span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn btn--primary" style={{ marginTop: 4 }}>Save Changes</button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-header"><h3>Notification Preferences</h3></div>
          <div className="settings-body">
            <div className="settings-row">
              <div><p className="settings-row-title">Email notifications</p><p className="settings-row-sub">Receive updates via email</p></div>
              <Toggle checked={notifs.email} onChange={(v) => setNotifs((n) => ({ ...n, email: v }))} />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">New requests</p><p className="settings-row-sub">Alert me when a new report or request is filed</p></div>
              <Toggle checked={notifs.newRequests} onChange={(v) => setNotifs((n) => ({ ...n, newRequests: v }))} />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">Pending verifications</p><p className="settings-row-sub">Alert me when documents need review</p></div>
              <Toggle checked={notifs.verifications} onChange={(v) => setNotifs((n) => ({ ...n, verifications: v }))} />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">Weekly digest</p><p className="settings-row-sub">A weekly summary of system activity</p></div>
              <Toggle checked={notifs.digest} onChange={(v) => setNotifs((n) => ({ ...n, digest: v }))} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>Security</h3></div>
          <div className="settings-body">
            <label className="field"><span>Current password</span><input type="password" placeholder="••••••••" /></label>
            <label className="field"><span>New password</span><input type="password" placeholder="••••••••" /></label>
            <button className="btn btn--outline" style={{ marginTop: 4 }} onClick={() => showToast('Password updated.', 'success')}>Update Password</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h3>System</h3></div>
          <div className="settings-body">
            <div className="settings-row">
              <div><p className="settings-row-title">System name</p><p className="settings-row-sub">Shown across the admin panel</p></div>
              <span className="muted-text">TMC-Care</span>
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">Version</p></div>
              <span className="muted-text">v1.0.0 (Front-end preview)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
