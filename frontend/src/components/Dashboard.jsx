import React, { useState } from 'react';
import StockChart from './StockChart';
import Icon from './Icon';

/* ── Inline markdown renderer ── */
function renderMarkdown(md) {
  if (!md) return null;
  const inline = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{p}</strong> : p
    );
  };
  return md.split(/\n\n+/).map((block, idx) => {
    const t = block.trim();
    if (!t) return null;
    if (t.startsWith('> '))
      return (
        <div key={idx} className="reasoning-callout">
          <Icon name="info" size={15} color="var(--color-brand)" />
          <span>{inline(t.slice(2))}</span>
        </div>
      );
    if (t.startsWith('### ')) return <h4 key={idx}>{inline(t.slice(4))}</h4>;
    if (t.startsWith('## '))  return <h3 key={idx}>{inline(t.slice(3))}</h3>;
    if (t.startsWith('# '))   return <h2 key={idx}>{inline(t.slice(2))}</h2>;
    if (t.startsWith('- ') || t.startsWith('* '))
      return <ul key={idx}>{t.split('\n').map((l, i) => <li key={i}>{inline(l.replace(/^[-*]\s+/, ''))}</li>)}</ul>;
    if (/^\d+\.\s+/.test(t))
      return <ol key={idx}>{t.split('\n').map((l, i) => <li key={i}>{inline(l.replace(/^\d+\.\s+/, ''))}</li>)}</ol>;
    return <p key={idx}>{inline(t)}</p>;
  });
}

/* ── Number helpers ── */
function fmtNum(num, currency = 'USD') {
  if (num == null) return 'N/A';
  if (num >= 1e12) return `${(num/1e12).toFixed(2)}T`;
  if (num >= 1e9)  return `${(num/1e9).toFixed(2)}B`;
  if (num >= 1e6)  return `${(num/1e6).toFixed(2)}M`;
  return num.toLocaleString('en-US');
}
function fmtPct(val) {
  if (val == null) return 'N/A';
  return `${(val * 100).toFixed(2)}%`;
}

/* ── SwotQuad sub-component ── */
function SwotQuad({ type, title, items }) {
  return (
    <div className={`swot-quad ${type}`}>
      <div className="swot-quad-title">{title}</div>
      {items?.length > 0
        ? <ul className="swot-list">{items.map((s, i) => <li key={i} className="swot-item">{s}</li>)}</ul>
        : <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No data available.</p>
      }
    </div>
  );
}

export default function Dashboard({ run, onSubmitFeedback, feedbackMessage, watchlist }) {
  const [logsOpen, setLogsOpen]               = useState(false);
  const [feedbackStatus, setFeedbackStatus]   = useState(run.feedbackStatus || 'none');
  const [feedbackComment, setFeedbackComment] = useState(run.feedbackComment || '');
  const [selectedTags, setSelectedTags]       = useState([]);
  const [submitted, setSubmitted]             = useState(run.feedbackStatus && run.feedbackStatus !== 'none');

  const isInvest      = run.decision === 'Invest';
  const hasFinancials = run.financialSummary && Object.keys(run.financialSummary).length > 0 && !run.financialSummary.error;
  const showBanner    = run.resolvedCompany && (run.resolutionStatus === 'resolved' || !run.resolutionStatus);
  const resolvedName  = run.resolvedCompany?.companyName || run.companyName;
  const resolvedTicker = run.resolvedCompany?.ticker || run.ticker;
  const isWatched     = watchlist?.isWatched(run.companyName);

  const auditTags = ['Outdated Metrics','Incorrect Ticker','Reasoning Typo','Missing Competitor','Overconfident Score','Underconfident Score'];

  const toggleTag = tag => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const metricFields = hasFinancials ? [
    { label: 'Market Cap',      value: run.financialSummary.marketCap     != null ? fmtNum(run.financialSummary.marketCap) + ' ' + (run.financialSummary.currency||'USD') : null },
    { label: 'P/E Ratio',       value: run.financialSummary.peRatio       != null ? run.financialSummary.peRatio.toFixed(2) : null },
    { label: 'Debt / Equity',   value: run.financialSummary.debtToEquity  != null ? `${run.financialSummary.debtToEquity.toFixed(2)}%` : null },
    { label: 'Gross Margin',    value: run.financialSummary.grossMargin   != null ? fmtPct(run.financialSummary.grossMargin)    : null },
    { label: 'Operating Margin',value: run.financialSummary.operatingMargin != null ? fmtPct(run.financialSummary.operatingMargin) : null },
    { label: 'Profit Margin',   value: run.financialSummary.profitMargin  != null ? fmtPct(run.financialSummary.profitMargin)  : null },
    { label: 'Revenue Growth',  value: run.financialSummary.revenueGrowth != null ? fmtPct(run.financialSummary.revenueGrowth) : null },
    { label: 'Free Cash Flow',  value: run.financialSummary.freeCashflow  != null ? fmtNum(run.financialSummary.freeCashflow) + ' ' + (run.financialSummary.currency||'USD') : null },
  ].filter(m => m.value && m.value !== 'N/A') : [];

  /* Confidence ring math */
  const R   = 48;
  const circ = 2 * Math.PI * R;
  const offset = circ - (run.confidence / 100) * circ;

  const handleFeedbackSubmit = e => {
    e.preventDefault();
    if (feedbackStatus === 'none') return;
    const prefix = selectedTags.length > 0 ? `[Tags: ${selectedTags.join(', ')}] ` : '';
    onSubmitFeedback(run.id, feedbackStatus, `${prefix}${feedbackComment}`);
    setSubmitted(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Identified banner */}
      {showBanner && (
        <div className="identified-banner">
          <Icon name="check" size={15} color="var(--color-invest)" />
          <span>
            Identified as: <strong>{resolvedName}</strong>
            {resolvedTicker && <span className="ticker-badge-inline">{resolvedTicker}</span>}
            {run.originalUserInput && run.originalUserInput.toLowerCase() !== resolvedName.toLowerCase() && (
              <span className="identified-from"> (from "{run.originalUserInput}")</span>
            )}
          </span>
        </div>
      )}

      {/* ── 1. HERO DECISION CARD ── */}
      <div className={`decision-hero ${isInvest ? 'invest' : 'pass'}`}>
        <div className="decision-hero-grid">
          {/* Left: company + verdict */}
          <div>
            <div>
              <span className="decision-company-name">{run.companyName}</span>
              {run.ticker && <span className="decision-ticker-badge">{run.ticker}</span>}
            </div>
            {hasFinancials && run.financialSummary.currentPrice != null && (
              <div className="decision-price">
                Current Price: <strong>${run.financialSummary.currentPrice.toFixed(2)} {run.financialSummary.currency}</strong>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <div className={`decision-verdict ${isInvest ? 'invest' : 'pass'}`}>
                {isInvest ? '↑ INVEST' : '↓ PASS'}
              </div>
              {watchlist && (
                <button
                  className={isWatched ? 'btn-ghost' : 'btn-brand'}
                  style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => isWatched ? watchlist.removeItem(run.companyName) : watchlist.addItem(run)}
                >
                  <Icon name="trending" size={13} color={isWatched ? 'var(--color-brand)' : '#fff'} />
                  {isWatched ? 'Watching' : '+ Watchlist'}
                </button>
              )}
            </div>
          </div>

          {/* Centre: confidence ring */}
          <div className="confidence-ring-wrap">
            <div className="confidence-ring-container">
              <svg className="confidence-ring-svg" viewBox="0 0 120 120">
                <circle className="conf-bg"   cx="60" cy="60" r={R} />
                <circle className={`conf-fill ${isInvest ? 'invest' : 'pass'}`}
                  cx="60" cy="60" r={R}
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="confidence-ring-center">
                <div className="conf-pct">{run.confidence}%</div>
                <div className="conf-lbl">Confidence</div>
              </div>
            </div>
          </div>

          {/* Right: risk */}
          <div className="risk-wrap">
            <div className="confidence-label">Risk Profile</div>
            <div className={`risk-pill ${run.riskRating?.toLowerCase()}`}>
              {run.riskRating} Risk
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. KEY METRICS ROW ── */}
      {metricFields.length > 0 && (
        <div className="metrics-row">
          {metricFields.map(m => {
            const isGrowth = m.label.includes('Growth') || m.label.includes('Margin') || m.label.includes('Cash');
            const numVal   = parseFloat(m.value);
            const changeClass = isGrowth ? (numVal >= 0 ? 'positive' : 'negative') : 'neutral';
            return (
              <div key={m.label} className="metric-card">
                <div className="metric-card-label">{m.label}</div>
                <div className="metric-card-value">{m.value}</div>
                <div className="metric-bar"><div className="metric-bar-fill" style={{ width: `${Math.min(Math.abs(numVal) / 2, 100)}%` }} /></div>
                <div className={`metric-card-change ${changeClass}`}>
                  {changeClass === 'positive' ? '▲' : changeClass === 'negative' ? '▼' : '—'}
                  {isGrowth ? m.value : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. THESIS + CHART/FEEDBACK COLUMNS ── */}
      <div className="content-grid-2">
        {/* CIO Thesis */}
        <div className="card">
          <div className="card-padded">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon"><Icon name="activity" size={15} color="var(--color-brand)" /></div>
                CIO Investment Thesis
              </div>
            </div>
            <div className="reasoning-prose">
              {renderMarkdown(run.reasoning)}
            </div>
          </div>
        </div>

        {/* Right column: chart + feedback */}
        <div className="content-stack">
          {run.chartData?.length > 0 && (
            <div className="card chart-card">
              <StockChart data={run.chartData} ticker={run.ticker} />
            </div>
          )}

          {/* Feedback */}
          <div className="card card-padded">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon"><Icon name="message" size={15} color="var(--color-brand)" /></div>
                Audit & Feedback
              </div>
            </div>

            {submitted ? (
              <div className="feedback-success">
                <div className="feedback-success-icon"><Icon name="check" size={28} color="var(--color-invest)" /></div>
                <div className="feedback-success-title">Feedback Registered</div>
                <div className="feedback-success-msg">
                  Rated "{feedbackStatus === 'helpful' ? 'Agree / Helpful' : 'Disagree / Audit'}"
                </div>
                {feedbackComment && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', border: '1px solid var(--border)' }}>
                    {feedbackComment}
                  </div>
                )}
                <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setSubmitted(false)}>Edit Feedback</button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="feedback-section">
                <div className="feedback-note">Rate the AI agent's decision accuracy:</div>
                <div className="feedback-btns">
                  <button type="button" className={`feedback-vote-btn${feedbackStatus === 'helpful' ? ' active-helpful' : ''}`} onClick={() => setFeedbackStatus('helpful')}>
                    <Icon name="thumbsUp" size={15} /> Agree
                  </button>
                  <button type="button" className={`feedback-vote-btn${feedbackStatus === 'unhelpful' ? ' active-unhelpful' : ''}`} onClick={() => setFeedbackStatus('unhelpful')}>
                    <Icon name="thumbsDown" size={15} /> Audit
                  </button>
                </div>
                {feedbackStatus !== 'none' && (
                  <div className="audit-tags">
                    {auditTags.map(tag => (
                      <button key={tag} type="button" className={`audit-tag-btn${selectedTags.includes(tag) ? ' selected' : ''}`} onClick={() => toggleTag(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <textarea className="feedback-textarea" placeholder="Leave auditor comments or correction notes…" value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} />
                <button type="submit" className="btn-brand" disabled={feedbackStatus === 'none'}>Submit Audit</button>
                {feedbackMessage && <div style={{ fontSize: '0.78rem', color: 'var(--color-invest)' }}>{feedbackMessage}</div>}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. SWOT GRID ── */}
      <div className="card card-padded">
        <div className="card-header">
          <div className="card-title">
            <div className="card-title-icon"><Icon name="shield" size={15} color="var(--color-brand)" /></div>
            SWOT Analysis
          </div>
        </div>
        <div className="swot-grid">
          <SwotQuad type="strengths"     title="Core Strengths"   items={run.fundamentalAnalysis?.strengths} />
          <SwotQuad type="weaknesses"    title="Vulnerabilities"  items={run.fundamentalAnalysis?.weaknesses} />
          <SwotQuad type="opportunities" title="Opportunities"    items={run.sentimentAnalysis?.opportunities} />
          <SwotQuad type="threats"       title="Risk Headwinds"   items={run.sentimentAnalysis?.threats} />
        </div>
      </div>

      {/* ── 5. SOURCE CITATIONS ── */}
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

      {/* ── 6. AGENT THOUGHT LOGS ── */}
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
