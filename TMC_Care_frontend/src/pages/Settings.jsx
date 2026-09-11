import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { api } from '../api/client';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifs, setNotifs] = useState({ email: true, newRequests: true, verifications: true, digest: false });
  const showToast = useToast();

  useEffect(() => {
    api.get('/me')
      .then((data) => {
        setUser(data);
        setName(data.name);
        setEmail(data.email);
      })
      .catch(() => showToast('Failed to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put('/me', { name, email });
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      showToast('Please fill in both password fields.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading || !user) return <div className="page-stack">Loading…</div>;

  return (
    <div className="page-stack">
      <PageHeader title="Settings" subtitle="Manage your account and system preferences." />

      <div className="settings-grid">
        <form className="panel" onSubmit={saveProfile}>
          <div className="panel-header"><h3>Profile</h3></div>
          <div className="settings-body">
            <div className="profile-head" style={{ marginBottom: 18 }}>
              <div className="avatar avatar--lg" style={{ backgroundColor: user.avatarColor }}>
                {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="profile-name">{name}</p>
                <p className="profile-sub">{user.role}</p>
              </div>
            </div>
            <label className="field"><span>Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field"><span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn btn--primary" style={{ marginTop: 4 }} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-header"><h3>Notification Preferences</h3></div>
          <div className="settings-body">
            <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 8 }}>
              These preferences aren't saved to your account yet — no backend endpoint exists for them.
            </p>
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
            <label className="field"><span>Current password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="field"><span>New password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <button
              className="btn btn--outline"
              style={{ marginTop: 4 }}
              onClick={updatePassword}
              disabled={savingPassword}
            >
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
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
              <span className="muted-text">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}