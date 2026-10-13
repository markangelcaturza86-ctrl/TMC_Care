import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { useTheme } from '../hooks/useTheme';
import { useSystemInfo, saveSystemName } from '../hooks/useSystemInfo';

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`toggle${checked ? ' toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={label}
    >
      <span className="toggle-knob" />
    </button>
  );
}

const DEFAULT_PREFS = { email: true, newRequests: true, verifications: true, digest: false, darkMode: false };

const initials = (name) =>
  (name || '').split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  const system = useSystemInfo();
  const [systemDraft, setSystemDraft] = useState(null); // null = untouched, show the saved name
  const systemName = systemDraft ?? system.name;
  const [savingSystem, setSavingSystem] = useState(false);

  const { dark, setDark } = useTheme();
  const showToast = useToast();

  useEffect(() => {
    api.get('/me')
      .then((data) => {
        setUser(data);
        setName(data.name);
        setEmail(data.email);
        setPrefs({ ...DEFAULT_PREFS, ...(data.preferences || {}) });
      })
      .catch(() => showToast('Failed to load profile.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const storeUser = (updated) => {
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  };

  // ---- Profile -----------------------------------------------------------
  const profileChanged = user && (name.trim() !== user.name || email.trim() !== user.email);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Please enter your full name.', 'error');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return showToast('Please enter a valid email address.', 'error');

    setSaving(true);
    try {
      const updated = await api.put('/me', { name: name.trim(), email: email.trim() });
      storeUser(updated);
      setName(updated.name);
      setEmail(updated.email);
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---- Notification + appearance preferences (saved on the account) -------
  const savePref = async (key, value) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    if (key === 'darkMode') setDark(value); // switch instantly, then save

    try {
      const updated = await api.put('/me/preferences', { [key]: value });
      storeUser(updated);
      setPrefs({ ...DEFAULT_PREFS, ...(updated.preferences || {}) });
      showToast(key === 'darkMode' ? (value ? 'Dark mode on.' : 'Dark mode off.') : 'Preference saved.', 'success');
    } catch (err) {
      setPrefs(previous);
      if (key === 'darkMode') setDark(previous.darkMode);
      showToast(err.message, 'error');
    }
  };

  // ---- Password ----------------------------------------------------------
  const updatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) {
      return showToast('Please fill in both password fields.', 'error');
    }
    if (newPassword.length < 6) {
      return showToast('The new password must be at least 6 characters.', 'error');
    }
    if (newPassword !== confirmPassword) {
      return showToast('The new passwords do not match.', 'error');
    }
    setSavingPassword(true);
    try {
      await api.put('/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // ---- System ------------------------------------------------------------
  const isSuperAdmin = user?.role === 'Super Administrator';
  const systemChanged = systemName.trim() !== '' && systemName.trim() !== system.name;

  const saveSystem = async (e) => {
    e.preventDefault();
    setSavingSystem(true);
    try {
      await saveSystemName(systemName.trim());
      setSystemDraft(null);
      showToast('System name updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingSystem(false);
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
                {initials(name)}
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
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn btn--primary" style={{ marginTop: 4 }} disabled={saving || !profileChanged}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-header"><h3>Notification Preferences</h3></div>
          <div className="settings-body">
            <div className="settings-row">
              <div><p className="settings-row-title">Email notifications</p><p className="settings-row-sub">Receive the alerts below by email</p></div>
              <Toggle checked={prefs.email} onChange={(v) => savePref('email', v)} label="Email notifications" />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">New requests</p><p className="settings-row-sub">Alert me when a new report or request is filed</p></div>
              <Toggle checked={prefs.newRequests} onChange={(v) => savePref('newRequests', v)} label="New requests" />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">Pending verifications</p><p className="settings-row-sub">Alert me when documents need review</p></div>
              <Toggle checked={prefs.verifications} onChange={(v) => savePref('verifications', v)} label="Pending verifications" />
            </div>
            <div className="settings-row">
              <div><p className="settings-row-title">Weekly digest</p><p className="settings-row-sub">A weekly email summary, sent every Monday</p></div>
              <Toggle checked={prefs.digest} onChange={(v) => savePref('digest', v)} label="Weekly digest" />
            </div>
          </div>
        </div>

        <form className="panel" onSubmit={updatePassword}>
          <div className="panel-header"><h3>Security</h3></div>
          <div className="settings-body">
            <label className="field"><span>Current password</span>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className="field"><span>New password</span>
              <input
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <label className="field"><span>Confirm new password</span>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--outline" style={{ marginTop: 4 }} disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>

        <div className="panel">
          <div className="panel-header"><h3>Appearance</h3></div>
          <div className="settings-body">
            <div className="settings-row">
              <div>
                <p className="settings-row-title">Dark mode</p>
                <p className="settings-row-sub">Use a dark colour scheme across the admin panel. Saved to your account.</p>
              </div>
              <Toggle checked={dark} onChange={(v) => savePref('darkMode', v)} label="Dark mode" />
            </div>
          </div>
        </div>

        <form className="panel" onSubmit={saveSystem}>
          <div className="panel-header"><h3>System</h3></div>
          <div className="settings-body">
            {isSuperAdmin ? (
              <>
                <label className="field"><span>System name</span>
                  <input value={systemName} maxLength={40} onChange={(e) => setSystemDraft(e.target.value)} />
                </label>
                <p className="settings-row-sub" style={{ marginTop: -6 }}>Shown across the admin panel.</p>
                <button type="submit" className="btn btn--primary" disabled={savingSystem || !systemChanged}>
                  {savingSystem ? 'Saving…' : 'Save System Name'}
                </button>
              </>
            ) : (
              <div className="settings-row">
                <div><p className="settings-row-title">System name</p><p className="settings-row-sub">Shown across the admin panel</p></div>
                <span className="muted-text">{system.name}</span>
              </div>
            )}
            <div className="settings-row">
              <div><p className="settings-row-title">Version</p></div>
              <span className="muted-text">v{system.version}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
