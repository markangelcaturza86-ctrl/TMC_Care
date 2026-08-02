import { useState } from 'react';
import { ShieldCheck, Mail, Lock } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@tmc.edu.ph');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    onLogin();
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <div className="sidebar-logo"><ShieldCheck size={24} strokeWidth={2.4} /></div>
          <div>
            <p className="sidebar-brand-name" style={{ color: '#0B1233' }}>TMC-Care</p>
            <p className="login-brand-sub">Student Incident Reporting System &middot; Admin Panel</p>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to manage reports, requests, and student cases.</p>

        <form className="login-form" onSubmit={submit}>
          {error && <div className="login-error">{error}</div>}
          <label className="field">
            <span>Email</span>
            <div className="input-with-icon">
              <Mail size={16} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tmc.edu.ph" />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-with-icon">
              <Lock size={16} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter any password to continue" />
            </div>
          </label>
          <div className="login-row">
            <label className="checkbox-row"><input type="checkbox" defaultChecked /> Remember me</label>
            <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
          </div>
          <button type="submit" className="btn btn--primary btn--block">Sign In</button>
        </form>
        <p className="login-footnote">This is a front-end preview. Any email and password will sign you in with mock data.</p>
      </div>
      <div className="login-side">
        <div className="login-side-content">
          <p className="login-side-eyebrow">TMC-Care</p>
          <h2>Supporting students, one report at a time.</h2>
          <p>Track incident reports, process financial assistance, and keep every student case moving forward.</p>
        </div>
      </div>
    </div>
  );
}
