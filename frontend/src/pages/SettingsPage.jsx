import React, { useState } from 'react';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage({ theme, onToggleTheme }) {
  const { currentUser, logout } = useAuth();

  const [profile, setProfile] = useState({
    name:  currentUser?.name  || 'Analyst',
    email: currentUser?.email || '',
  });
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    emailResearch: true, emailWeekly: false,
    inAppResearch: true, inAppSystem: true,
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    // TODO: call account.updateName() / account.updateEmail() when ready
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = async () => {
    await logout();
  };

  const SectionCard = ({ title, icon, children }) => (
    <div className="card card-padded">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon"><Icon name={icon} size={15} color="var(--color-brand)" /></div>
          {title}
        </div>
      </div>
      {children}
    </div>
  );

  const ToggleRow = ({ label, sub, checked, onChange }) => (
    <div className="settings-toggle-row">
      <div>
        <div className="settings-toggle-label">{label}</div>
        {sub && <div className="settings-toggle-sub">{sub}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-track"><span className="toggle-thumb" /></span>
      </label>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
      <div>
        <h1 className="page-heading">Settings</h1>
        <p className="page-subheading">Manage your profile, appearance, and preferences.</p>
      </div>

      {/* Profile */}
      <SectionCard title="Profile" icon="award">
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="settings-avatar-row">
            <div className="settings-avatar">{profile.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{profile.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{profile.email}</div>
            </div>
          </div>
          <div className="settings-field-row">
            <div className="settings-field">
              <label className="settings-field-label">Display Name</label>
              <input className="settings-input" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} placeholder="Your name" />
            </div>
            <div className="settings-field">
              <label className="settings-field-label">Email</label>
              <input className="settings-input" type="email" value={profile.email} onChange={e => setProfile(p => ({...p, email: e.target.value}))} placeholder="Email address" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn-brand" style={{ padding: '9px 22px' }}>Save Profile</button>
            {saved && <span style={{ fontSize: '0.8rem', color: 'var(--color-invest)', fontWeight: 600 }}>✓ Saved!</span>}
          </div>
        </form>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance" icon="activity">
        <ToggleRow label="Dark Mode" sub="Switch between light and dark interface theme" checked={theme === 'dark'} onChange={() => onToggleTheme()} />
        <div className="settings-divider" />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 12 }}>
          Font size, chart colors, and density options coming soon.
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" icon="alert">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <ToggleRow label="Email: Research complete" sub="Receive an email when a research run finishes" checked={notifs.emailResearch} onChange={v => setNotifs(p => ({...p, emailResearch: v}))} />
          <div className="settings-divider" />
          <ToggleRow label="Email: Weekly digest" sub="Weekly summary of your saved watchlist" checked={notifs.emailWeekly} onChange={v => setNotifs(p => ({...p, emailWeekly: v}))} />
          <div className="settings-divider" />
          <ToggleRow label="In-app: Research alerts" sub="Show notification badge when research completes" checked={notifs.inAppResearch} onChange={v => setNotifs(p => ({...p, inAppResearch: v}))} />
          <div className="settings-divider" />
          <ToggleRow label="In-app: System messages" sub="Platform updates and feature announcements" checked={notifs.inAppSystem} onChange={v => setNotifs(p => ({...p, inAppSystem: v}))} />
        </div>
      </SectionCard>

      {/* Account */}
      <SectionCard title="Account" icon="shield">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentUser && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Signed in as <strong>{currentUser.email}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '9px 18px' }} onClick={handleLogout}>
              Log Out
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.82rem', padding: '9px 18px', color: 'var(--color-pass)', borderColor: 'var(--color-pass-border)' }}
              disabled
            >
              Delete Account
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
