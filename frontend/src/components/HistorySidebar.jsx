import Icon from './Icon';

export default function HistorySidebar({ runs, activeRunId, onSelectRun, onNewSearch, onToggleSidebar }) {
  // Helper to format date: "2026-06-26 15:20:00" -> "Jun 26, 15:20"
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split(' ');
      if (parts.length < 2) return dateStr;
      
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');
      
      if (dateParts.length !== 3 || timeParts.length < 2) return dateStr;
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = parseInt(dateParts[1]) - 1;
      const month = monthNames[monthIndex] || dateParts[1];
      const day = dateParts[2];
      
      return `${month} ${day}, ${timeParts[0]}:${timeParts[1]}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={onNewSearch}>
            <div className="logo-icon">
              <Icon name="activity" size={20} color="#030408" />
            </div>
            <div>
              <div className="logo-text">InsideInvest</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI Research Agent</div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onToggleSidebar}
            title="Collapse History Sidebar"
            className="sidebar-collapse-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Icon name="chevronLeft" size={18} />
          </button>
        </div>
      </div>
      
      <div className="sidebar-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="sidebar-section-title" style={{ margin: 0 }}>RESEARCH HISTORY</div>
          <button 
            onClick={onNewSearch}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: 'var(--color-primary)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontFamily: 'var(--font-title)'
            }}
          >
            + New
          </button>
        </div>

        {runs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 10px' }}>
            No research logs found. Search for a company to create your first report!
          </div>
        ) : (
          <div className="history-list">
            {runs.map((run) => {
              const isActive = run.id === activeRunId;
              const isInvest = run.decision === 'Invest';
              
              return (
                <div 
                  key={run.id}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectRun(run.id)}
                >
                  <div className="history-item-top">
                    <span className="history-company-name" title={run.companyName}>
                      {run.companyName}
                    </span>
                    {run.ticker && (
                      <span className="history-ticker">{run.ticker}</span>
                    )}
                  </div>
                  
                  <div className="history-item-details">
                    <span className={`badge-small ${isInvest ? 'invest' : 'pass'}`}>
                      {run.decision}
                    </span>
                    <span className="history-confidence">
                      {run.confidence}% confidence
                    </span>
                  </div>

                  <div className="history-item-top" style={{ marginTop: '4px' }}>
                    {run.feedbackStatus !== 'none' ? (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: run.feedbackStatus === 'helpful' ? 'var(--color-invest)' : 'var(--color-pass)',
                        fontWeight: '600'
                      }}>
                        {run.feedbackStatus === 'helpful' ? '👍 Helpful' : '👎 Pass/Audit'}
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <span className="history-date">{formatDate(run.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="sidebar-footer">
        InsideInvest v1.0.0
      </div>
    </div>
  );
}
