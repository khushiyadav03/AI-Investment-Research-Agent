import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function LoginPage({ onNavigate }) {
  const { login, authError, clearAuthError, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => { clearAuthError(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim() || !password) { setLocalError('Please enter your email and password.'); return; }
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result.success) onNavigate('research');
  };

  const errorMsg = localError || authError;

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon-box" style={{ width: 44, height: 44, borderRadius: 12 }}>
            <Icon name="activity" size={22} color="#FFFFFF" />
          </div>
          <div>
            <div className="logo-name" style={{ fontSize: '1.2rem' }}>InsideInvest</div>
            <div className="logo-tagline">AI Research Agent</div>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue researching.</p>

        {errorMsg && (
          <div className="auth-error">
            <Icon name="alert" size={15} color="var(--color-pass)" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="settings-field">
            <label className="settings-field-label">Email address</label>
            <input
              className="settings-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">Password</label>
            <input
              className="settings-input"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn-brand auth-submit-btn"
            disabled={submitting || loading}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-link-btn" onClick={() => onNavigate('signup')}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
