import React from 'react';
import Icon from './Icon';

const DecisionBadge = ({ decision }) => {
  if (decision === 'Invest') return <span className="badge-invest">Invest</span>;
  if (decision === 'Pass')   return <span className="badge-pass">Pass</span>;
  return <span className="badge-unresolved">{decision || 'N/A'}</span>;
};

export default function HistorySidebar({
  runs, activeRunId, onSelectRun, onNewSearch,
  collapsed, onToggleCollapse,
  activePage, onNavigate,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts     = dateStr.split(' ');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1]?.split(':') || [];
      const months    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[parseInt(dateParts[1])-1]} ${dateParts[2]}, ${timeParts[0]}:${timeParts[1]}`;
    } catch { return dateStr; }
  };

  // ── Main nav — no History button ─────────────────────────────
  const mainNav = [
    { id: 'research',       label: 'Research',       icon: 'search',   badge: null },
    { id: 'watchlist',      label: 'Watchlist',      icon: 'trending', badge: null },
    { id: 'settings',       label: 'Settings',       icon: 'shield',   badge: null },
  ];

  // ── Support nav ──────────────────────────────────────────────
  const supportNav = [
    { id: 'documentation',  label: 'Documentation',  icon: 'info',     badge: null },
    { id: 'feedback',       label: 'Feedback',       icon: 'message',  badge: null },
  ];

  const handleNavClick = (id) => {
    if (id === 'research') { onNewSearch(); onNavigate('research'); }
    else onNavigate(id);
  };

  const NavBtn = ({ item }) => {
    const isActive = activePage === item.id;
    return (
      <button
        className={`nav-item${isActive ? ' active' : ''}${collapsed ? ' nav-item-icon-only' : ''}`}
        onClick={() => handleNavClick(item.id)}
        title={collapsed ? item.label : undefined}
      >
        <Icon name={item.icon} size={16} color={isActive ? '#FFFFFF' : 'currentColor'} />
        {!collapsed && <span className="nav-item-label">{item.label}</span>}
        {!collapsed && item.badge != null && <span className="nav-item-badge">{item.badge}</span>}
        {collapsed  && item.badge != null && <span className="nav-item-badge-dot" />}
      </button>
    );
  };

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        {!collapsed && (
          <div className="logo-mark" onClick={onNewSearch}>
            <div className="logo-icon-box">
              <Icon name="activity" size={18} color="#FFFFFF" />
            </div>
            <div>
              <div className="logo-name">InsideInvest</div>
              <div className="logo-tagline">AI Research Agent</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="logo-icon-box" style={{ margin: '0 auto', cursor: 'pointer' }} onClick={onNewSearch}>
            <Icon name="activity" size={18} color="#FFFFFF" />
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={collapsed ? { margin: '0 auto', marginTop: 8 } : {}}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
        </button>
      </div>

      {/* ── Nav body ── */}
      <div className="sidebar-body">

        {/* Pages section */}
        {!collapsed && <div className="sidebar-section-label">Pages</div>}
        {mainNav.map(item => <NavBtn key={item.id} item={item} />)}

        {/* Recent research history list */}
        {!collapsed && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Recent Research</div>
            {runs.length === 0 ? (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No reports yet.
              </div>
            ) : (
              <div className="sidebar-history-list">
                {runs.map(run => (
                  <div
                    key={run.id}
                    className={`history-nav-item${run.id === activeRunId ? ' active' : ''}`}
                    onClick={() => { onSelectRun(run.id); onNavigate('research'); }}
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
          </>
        )}

        {/* Support section */}
        {!collapsed && <div className="sidebar-section-label" style={{ marginTop: 8 }}>Support</div>}
        {collapsed   && <div style={{ height: 8 }} />}
        {supportNav.map(item => <NavBtn key={item.id} item={item} />)}

      </div>

      {!collapsed && (
        <div className="sidebar-footer-section">
          <div className="sidebar-footer-text">InsideInvest v1.0.0</div>
        </div>
      )}
    </aside>
  );
}
