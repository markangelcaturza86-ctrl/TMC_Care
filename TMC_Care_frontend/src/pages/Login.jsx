import { useState } from 'react';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { api } from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
            </div>
          </label>
          <div className="login-row">
            <label className="checkbox-row"><input type="checkbox" defaultChecked /> Remember me</label>
            <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
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