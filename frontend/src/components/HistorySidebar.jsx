import React from 'react';
import Icon from './Icon';

const DecisionBadge = ({ decision }) => {
  if (decision === 'Invest') return <span className="badge-invest">Invest</span>;
  if (decision === 'Pass')   return <span className="badge-pass">Pass</span>;
  return <span className="badge-unresolved">{decision || 'N/A'}</span>;
};

export default function HistorySidebar({ runs, activeRunId, onSelectRun, onNewSearch, onToggleSidebar }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1]?.split(':') || [];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(dateParts[1])-1]} ${dateParts[2]}, ${timeParts[0]}:${timeParts[1]}`;
    } catch { return dateStr; }
  };

  const navItems = [
    { id: 'research', label: 'Research', icon: 'search',   badge: null,            active: true },
    { id: 'history',  label: 'History',  icon: 'history',  badge: runs.length || null, active: false },
    { id: 'trending', label: 'Watchlist',icon: 'trending', badge: null,            active: false },
    { id: 'settings', label: 'Settings', icon: 'shield',   badge: null,            active: false },
  ];

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark" onClick={onNewSearch}>
          <div className="logo-icon-box">
            <Icon name="activity" size={18} color="#FFFFFF" />
          </div>
          <div>
            <div className="logo-name">InsideInvest</div>
            <div className="logo-tagline">AI Research Agent</div>
          </div>
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggleSidebar} title="Collapse sidebar">
          <Icon name="chevronLeft" size={16} />
        </button>
      </div>

      {/* Nav body */}
      <div className="sidebar-body">
        <div className="sidebar-section-label">Pages</div>

        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item${item.active ? ' active' : ''}`}
            onClick={item.id === 'research' ? onNewSearch : undefined}
          >
            <Icon name={item.icon} size={16} color={item.active ? '#FFFFFF' : 'currentColor'} />
            {item.label}
            {item.badge != null && (
              <span className="nav-item-badge">{item.badge}</span>
            )}
          </button>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Research History</div>

        {runs.length === 0 ? (
          <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            No reports yet. Search a company to get started.
          </div>
        ) : (
          <div className="sidebar-history-list">
            {runs.map(run => (
              <div
                key={run.id}
                className={`history-nav-item${run.id === activeRunId ? ' active' : ''}`}
                onClick={() => onSelectRun(run.id)}
              >
                <div className="history-nav-top">
                  <span className="history-nav-name" title={run.companyName}>{run.companyName}</span>
                  {run.ticker && <span className="history-nav-ticker">{run.ticker}</span>}
                </div>
                <div className="history-nav-bottom">
                  <DecisionBadge decision={run.decision} />
                  <span className="history-nav-date">{formatDate(run.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Support</div>
        <button className="nav-item" onClick={onNewSearch}>
          <Icon name="info" size={16} color="currentColor" />
          Documentation
        </button>
        <button className="nav-item">
          <Icon name="message" size={16} color="currentColor" />
          Feedback
        </button>
      </div>

      <div className="sidebar-footer-section">
        <div className="sidebar-footer-text">InsideInvest v1.0.0</div>
      </div>
    </div>
  );
}
