import React, { useState } from 'react';
import Icon from './Icon';

function renderMarkdown(md) {
  if (!md) return null;
  const inline = text => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p}</strong> : p
    );
  };
  return md.split(/\n\n+/).map((block, idx) => {
    const t = block.trim();
    if (!t) return null;
    if (t.startsWith('## ')) return <h3 key={idx}>{inline(t.slice(3))}</h3>;
    if (t.startsWith('# '))  return <h2 key={idx}>{inline(t.slice(2))}</h2>;
    if (t.startsWith('- '))
      return <ul key={idx}>{t.split('\n').map((l, i) => <li key={i}>{inline(l.replace(/^-\s+/, ''))}</li>)}</ul>;
    return <p key={idx}>{inline(t)}</p>;
  });
}

export default function LimitedDataReport({ run }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const company = run.resolvedCompany?.companyName || run.companyName;
  const ticker  = run.resolvedCompany?.ticker || run.ticker;

  const hasQualitative =
    run.fundamentalAnalysis?.strengths?.length > 0 ||
    run.fundamentalAnalysis?.metricsSummary ||
    run.sentimentAnalysis?.marketSentimentSummary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header panel */}
      <div className="resolution-panel limited-data" style={{ maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-warn-bg)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="database" size={22} color="var(--color-warn)" />
          </div>
          <div>
            <div className="resolution-title" style={{ fontSize: '1.1rem', marginBottom: 2 }}>Limited Data Available</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <strong>{company}</strong>{ticker && ` · ${ticker}`} — no public financial disclosures found
            </div>
          </div>
        </div>
        <p className="resolution-message" style={{ textAlign: 'left', marginBottom: 0 }}>
          <strong>{company}</strong> was identified but sufficient financial data isn't available to generate an
          investment decision. It may be privately held or not publicly traded.
        </p>
      </div>

      {/* Qualitative summary */}
      <div className="card card-padded">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon"><Icon name="activity" size={15} color="var(--color-brand)" /></div>
            Qualitative Research Summary
          </div>
        </div>
        <div className="reasoning-prose">{renderMarkdown(run.reasoning)}</div>
      </div>

      {hasQualitative && (
        <div className="card card-padded">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon"><Icon name="shield" size={15} color="var(--color-brand)" /></div>
              Available Information
            </div>
          </div>
          {run.fundamentalAnalysis?.metricsSummary && (
            <div className="qualitative-block">
              <h4>Business Overview</h4>
              <p>{run.fundamentalAnalysis.metricsSummary}</p>
            </div>
          )}
          {run.sentimentAnalysis?.marketSentimentSummary && (
            <div className="qualitative-block">
              <h4>Market / Ownership Status</h4>
              <p>{run.sentimentAnalysis.marketSentimentSummary}</p>
            </div>
          )}
          {run.fundamentalAnalysis?.strengths?.length > 0 && (
            <div className="qualitative-block">
              <h4>Key Highlights</h4>
              <ul>{run.fundamentalAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {run.searchResults?.length > 0 && (
        <div className="card card-padded">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon"><Icon name="globe" size={15} color="var(--color-brand)" /></div>
              Source Citations
            </div>
          </div>
          <div className="snippet-list">
            {run.searchResults.map((s, i) => (
              <div key={i} className="snippet-item">
                <div className="snippet-item-top">
                  <span className="snippet-item-title">{s.title}</span>
                  {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="snippet-item-link">{s.link}</a>}
                </div>
                <p className="snippet-item-desc">{s.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {run.thoughtLogs?.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <button className="logs-toggle" onClick={() => setLogsOpen(o => !o)}>
            <span className="logs-toggle-title">
              <Icon name="cpu" size={15} color="var(--text-muted)" />
              Internal Agent Thought Logs
            </span>
            <span className={`logs-toggle-arrow${logsOpen ? ' open' : ''}`}>▶</span>
          </button>
          {logsOpen && (
            <div className="logs-content">
              {run.thoughtLogs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
