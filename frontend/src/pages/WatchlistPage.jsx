import React from 'react';
import Icon from '../components/Icon';

function fmtDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

export default function WatchlistPage({ watchlist, onRemove, onResearch }) {
  const { items, removeItem } = watchlist;

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 className="page-heading">Watchlist</h1>
          <p className="page-subheading">Companies you've saved for quick access.</p>
        </div>
        <div className="card card-padded" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ marginBottom: 16 }}>
            <Icon name="trending" size={40} color="var(--text-muted)" />
          </div>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Your watchlist is empty
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px' }}>
            After researching a company, click <strong>"Add to Watchlist"</strong> on the report to save it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-heading">Watchlist</h1>
          <p className="page-subheading">{items.length} compan{items.length === 1 ? 'y' : 'ies'} saved</p>
        </div>
      </div>

      <div className="watchlist-grid">
        {items.map(item => (
          <div key={item.companyName} className="watchlist-card">
            {/* Card top */}
            <div className="watchlist-card-top">
              <div className="watchlist-company-icon">
                {(item.companyName?.[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="watchlist-company-name" title={item.companyName}>{item.companyName}</div>
                {item.ticker && <div className="watchlist-ticker">{item.ticker}</div>}
              </div>
              {item.decision === 'Invest' && <span className="badge-invest">Invest</span>}
              {item.decision === 'Pass'   && <span className="badge-pass">Pass</span>}
            </div>

            {/* Metrics row */}
            <div className="watchlist-metrics">
              {item.confidence != null && (
                <div className="watchlist-metric">
                  <span className="watchlist-metric-label">Confidence</span>
                  <span className="watchlist-metric-value">{item.confidence}%</span>
                </div>
              )}
              {item.riskRating && (
                <div className="watchlist-metric">
                  <span className="watchlist-metric-label">Risk</span>
                  <span className={`watchlist-metric-value risk-${item.riskRating?.toLowerCase()}`}>{item.riskRating}</span>
                </div>
              )}
              <div className="watchlist-metric">
                <span className="watchlist-metric-label">Added</span>
                <span className="watchlist-metric-value">{fmtDate(item.addedAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="watchlist-actions">
              <button
                className="btn-brand"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }}
                onClick={() => onResearch(item.companyName)}
              >
                <Icon name="search" size={13} color="#fff" /> Research
              </button>
              <button
                className="btn-ghost"
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                onClick={() => removeItem(item.companyName)}
                title="Remove from watchlist"
              >
                <Icon name="alert" size={13} color="var(--color-pass)" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
