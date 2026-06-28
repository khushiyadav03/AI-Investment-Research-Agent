import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

export default function SignupPage({ onNavigate }) {
  const { signup, authError, clearAuthError, loading } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => { clearAuthError(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim())           { setLocalError('Please enter your name.'); return; }
    if (!email.trim())          { setLocalError('Please enter your email.'); return; }
    if (password.length < 8)    { setLocalError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)   { setLocalError('Passwords do not match.'); return; }
    setSubmitting(true);
    const result = await signup(email.trim(), password, name.trim());
    setSubmitting(false);
    if (result.success) onNavigate('research');
  };

  const errorMsg = localError || authError;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon-box" style={{ width: 44, height: 44, borderRadius: 12 }}>
            <Icon name="activity" size={22} color="#FFFFFF" />
          </div>
          <div>
            <div className="logo-name" style={{ fontSize: '1.2rem' }}>InsideInvest</div>
            <div className="logo-tagline">AI Research Agent</div>
          </div>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start researching companies with AI-powered analysis.</p>

        {errorMsg && (
          <div className="auth-error">
            <Icon name="alert" size={15} color="var(--color-pass)" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="settings-field">
            <label className="settings-field-label">Full Name</label>
            <input
              className="settings-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">Email address</label>
            <input
              className="settings-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">Password</label>
            <input
              className="settings-input"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="settings-field">
            <label className="settings-field-label">Confirm Password</label>
            <input
              className="settings-input"
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn-brand auth-submit-btn"
            disabled={submitting || loading}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-link-btn" onClick={() => onNavigate('login')}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
