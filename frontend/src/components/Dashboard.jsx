import React, { useState } from 'react';
import StockChart from './StockChart';
import Icon from './Icon';

export default function Dashboard({ run, onSubmitFeedback, feedbackMessage }) {
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState(run.feedbackStatus || 'none');
  const [feedbackComment, setFeedbackComment] = useState(run.feedbackComment || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(run.feedbackStatus && run.feedbackStatus !== 'none');

  const isInvest = run.decision === 'Invest';
  const hasFinancials = run.financialSummary && Object.keys(run.financialSummary).length > 0 && !run.financialSummary.error;

  // Audit quick-select tags
  const auditTags = [
    "Outdated Metrics",
    "Incorrect Ticker",
    "Reasoning Typo",
    "Missing Competitor",
    "Overconfident Score",
    "Underconfident Score"
  ];

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  // Custom Inline Markdown & Callout Renderer
  const replaceInlineMarkdown = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} style={{ color: '#ffffff', fontWeight: '700' }}>{part}</strong>;
      }
      return part;
    });
  };

  const renderMarkdown = (md) => {
    if (!md) return '';
    const blocks = md.split(/\n\n+/);
    return blocks.map((block, index) => {
      const text = block.trim();
      if (!text) return null;

      // Handle standard blockquote callouts
      if (text.startsWith('> ')) {
        const cleanQuote = text.replace(/^>\s+/, '');
        return (
          <blockquote key={index} className="reasoning-blockquote">
            <Icon name="info" size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{replaceInlineMarkdown(cleanQuote)}</div>
          </blockquote>
        );
      }

      if (text.startsWith('### ')) {
        return <h4 key={index}>{replaceInlineMarkdown(text.slice(4))}</h4>;
      }
      if (text.startsWith('## ')) {
        return <h3 key={index}>{replaceInlineMarkdown(text.slice(3))}</h3>;
      }
      if (text.startsWith('# ')) {
        return <h2 key={index}>{replaceInlineMarkdown(text.slice(2))}</h2>;
      }

      if (text.startsWith('- ') || text.startsWith('* ')) {
        const lines = text.split('\n');
        return (
          <ul key={index}>
            {lines.map((line, idx) => (
              <li key={idx}>{replaceInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>
            ))}
          </ul>
        );
      }

      if (/^\d+\.\s+/.test(text)) {
        const lines = text.split('\n');
        return (
          <ol key={index}>
            {lines.map((line, idx) => (
              <li key={idx}>{replaceInlineMarkdown(line.replace(/^\d+\.\s+/, ''))}</li>
            ))}
          </ol>
        );
      }

      return <p key={index}>{replaceInlineMarkdown(text)}</p>;
    });
  };

  // Helper to format large numbers
  const formatNumber = (num, currency = 'USD') => {
    if (num === null || num === undefined) return 'N/A';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    });
    
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T ${currency}`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B ${currency}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M ${currency}`;
    
    return formatter.format(num);
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return `${(val * 100).toFixed(2)}%`;
  };

  // Circumference of circular gauge (r = 55)
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (run.confidence / 100) * circumference;

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (feedbackStatus === 'none') return;
    
    // Combine tags and text comment for persistence
    const tagPrefix = selectedTags.length > 0 ? `[Tags: ${selectedTags.join(', ')}] ` : '';
    const fullComment = `${tagPrefix}${feedbackComment}`;
    
    onSubmitFeedback(run.id, feedbackStatus, fullComment);
    setFeedbackSubmitted(true);
  };

  return (
    <div className="report-layout">
      {/* 1. CIO HERO DECISION CARD */}
      <div className={`decision-card ${isInvest ? 'invest' : 'pass'}`}>
        <div className="decision-grid">
          <div className="decision-info">
            <div className="company-meta">
              <span className="company-name-large">{run.companyName}</span>
              {run.ticker && <span className="ticker-badge-large">{run.ticker}</span>}
            </div>
            {hasFinancials && (
              <div className="current-price-badge">
                Current Price: ${run.financialSummary.currentPrice?.toFixed(2)} {run.financialSummary.currency}
              </div>
            )}
            <div className="decision-badge-container">
              <div className={`decision-badge-big ${isInvest ? 'invest' : 'pass'}`}>
                {isInvest ? 'INVEST' : 'PASS'}
              </div>
            </div>
          </div>

          <div className="confidence-gauge-container">
            <svg className="gauge-svg">
              <circle className="gauge-bg" cx="70" cy="70" r={radius} />
              <circle 
                className={`gauge-fill ${isInvest ? 'invest' : 'pass'}`} 
                cx="70" 
                cy="70" 
                r={radius} 
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="gauge-text">
              <span className="gauge-percent">{run.confidence}%</span>
              <span className="gauge-label">CONFIDENCE</span>
            </div>
          </div>

          <div className="risk-rating-container">
            <span className="risk-label">RISK PROFILE</span>
            <div className={`risk-badge-large ${run.riskRating?.toLowerCase()}`}>
              {run.riskRating} RISK
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* 2. CIO RECOMMENDATION REASONING */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="activity" color="var(--color-primary)" size={20} />
              CIO INVESTMENT THESIS
            </h3>
          </div>
          <div className="reasoning-text">
            {renderMarkdown(run.reasoning)}
          </div>
        </div>

        {/* 3. CHART & PERSISTENCE FEEDBACK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Chart Panel */}
          {run.chartData && run.chartData.length > 0 && (
            <div className="dashboard-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Icon name="trending" color="var(--color-primary)" size={20} />
                  MARKET HISTORY
                </h3>
              </div>
              <StockChart data={run.chartData} ticker={run.ticker} />
            </div>
          )}

          {/* Feedback Form Panel */}
          <div className="dashboard-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Icon name="message" color="var(--color-primary)" size={20} />
                AUDIT & FEEDBACK
              </h3>
            </div>
            
            {feedbackSubmitted ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ marginBottom: '12px' }}>
                  <Icon name="check" color="var(--color-invest)" size={32} />
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Feedback Registered</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Decision rating set to "{feedbackStatus === 'helpful' ? 'Approved (Helpful)' : 'Needs Audit (Unhelpful)'}"
                </p>
                {feedbackComment && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.015)', 
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-glass)',
                    lineHeight: '1.4'
                  }}>
                    {feedbackComment}
                  </div>
                )}
                <button
                  onClick={() => setFeedbackSubmitted(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary-dark)',
                    fontSize: '0.8rem',
                    marginTop: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: '600'
                  }}
                >
                  Edit Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="feedback-box">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Rate the AI agent's decision accuracy:
                </div>
                <div className="feedback-buttons">
                  <button
                    type="button"
                    className={`feedback-btn ${feedbackStatus === 'helpful' ? 'active helpful' : ''}`}
                    onClick={() => setFeedbackStatus('helpful')}
                  >
                    <Icon name="thumbsUp" size={16} /> Agree / Helpful
                  </button>
                  <button
                    type="button"
                    className={`feedback-btn ${feedbackStatus === 'unhelpful' ? 'active unhelpful' : ''}`}
                    onClick={() => setFeedbackStatus('unhelpful')}
                  >
                    <Icon name="thumbsDown" size={16} /> Disagree / Audit
                  </button>
                </div>
                
                {/* Audit quick select tags */}
                {feedbackStatus !== 'none' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                      Select audit labels (optional):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {auditTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            style={{
                              background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255,255,255,0.02)',
                              border: '1px solid',
                              borderColor: isSelected ? '#00f2fe' : 'var(--border-glass)',
                              color: isSelected ? '#00f2fe' : 'var(--text-secondary)',
                              borderRadius: '20px',
                              padding: '4px 10px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <textarea
                  className="feedback-textarea"
                  placeholder="Leave any auditor comments or correction notes..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
                
                <button 
                  type="submit" 
                  className="submit-feedback-btn"
                  disabled={feedbackStatus === 'none'}
                >
                  Submit Audit Run
                </button>
                {feedbackMessage && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-invest)' }}>{feedbackMessage}</div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 4. KEY METRICS GRID (IF PUBLIC) */}
      {hasFinancials && (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="database" color="var(--color-primary)" size={20} />
              KEY FINANCIAL METRICS
            </h3>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Market Capitalization</span>
              <span className="metric-value">
                {formatNumber(run.financialSummary.marketCap, run.financialSummary.currency)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Valuation (P/E Ratio)</span>
              <span className="metric-value">
                {run.financialSummary.peRatio ? run.financialSummary.peRatio.toFixed(2) : 'N/A'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Debt-to-Equity (D/E)</span>
              <span className="metric-value">
                {run.financialSummary.debtToEquity ? `${run.financialSummary.debtToEquity.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Gross Margin</span>
              <span className="metric-value">
                {formatPercent(run.financialSummary.grossMargin)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Operating Margin</span>
              <span className="metric-value">
                {formatPercent(run.financialSummary.operatingMargin)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Profit Margin</span>
              <span className="metric-value">
                {formatPercent(run.financialSummary.profitMargin)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Revenue Growth (YoY)</span>
              <span className="metric-value">
                {formatPercent(run.financialSummary.revenueGrowth)}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Free Cash Flow</span>
              <span className="metric-value">
                {formatNumber(run.financialSummary.freeCashflow, run.financialSummary.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. FUNDAMENTALS AND SENTIMENT HIGHLIGHTS (SWOT GRID) */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <Icon name="shield" color="var(--color-primary)" size={20} />
            SWOT ANALYSIS SUMMARY
          </h3>
        </div>
        <div className="swot-grid">
          {/* Strengths */}
          <div className="swot-card strengths">
            <div className="swot-card-header">Core Strengths</div>
            <ul className="swot-list">
              {run.fundamentalAnalysis?.strengths && run.fundamentalAnalysis.strengths.length > 0 ? (
                run.fundamentalAnalysis.strengths.map((str, idx) => (
                  <li key={idx} className="swot-item">{str}</li>
                ))
              ) : (
                <li style={{ listStyleType: 'none', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.82rem', paddingLeft: 0 }}>
                  No core strengths recorded. Run a new research query to generate SWOT data.
                </li>
              )}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="swot-card weaknesses">
            <div className="swot-card-header">Vulnerabilities</div>
            <ul className="swot-list">
              {run.fundamentalAnalysis?.weaknesses && run.fundamentalAnalysis.weaknesses.length > 0 ? (
                run.fundamentalAnalysis.weaknesses.map((weak, idx) => (
                  <li key={idx} className="swot-item">{weak}</li>
                ))
              ) : (
                <li style={{ listStyleType: 'none', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.82rem', paddingLeft: 0 }}>
                  No vulnerabilities recorded. Run a new research query to generate SWOT data.
                </li>
              )}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="swot-card opportunities">
            <div className="swot-card-header">Opportunities</div>
            <ul className="swot-list">
              {run.sentimentAnalysis?.opportunities && run.sentimentAnalysis.opportunities.length > 0 ? (
                run.sentimentAnalysis.opportunities.map((opp, idx) => (
                  <li key={idx} className="swot-item">{opp}</li>
                ))
              ) : (
                <li style={{ listStyleType: 'none', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.82rem', paddingLeft: 0 }}>
                  No opportunities recorded. Run a new research query to generate SWOT data.
                </li>
              )}
            </ul>
          </div>

          {/* Threats */}
          <div className="swot-card threats">
            <div className="swot-card-header">Risk Headwinds</div>
            <ul className="swot-list">
              {run.sentimentAnalysis?.threats && run.sentimentAnalysis.threats.length > 0 ? (
                run.sentimentAnalysis.threats.map((thr, idx) => (
                  <li key={idx} className="swot-item">{thr}</li>
                ))
              ) : (
                <li style={{ listStyleType: 'none', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.82rem', paddingLeft: 0 }}>
                  No risk headwinds recorded. Run a new research query to generate SWOT data.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 6. WEB SEARCH DATA SOURCES */}
      {run.searchResults && run.searchResults.length > 0 && (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="globe" color="var(--color-primary)" size={20} />
              SOURCE CITATIONS (FREE DATA)
            </h3>
          </div>
          <div className="snippets-list">
            {run.searchResults.map((snip, idx) => (
              <div key={idx} className="snippet-card">
                <div className="snippet-title-row">
                  <span className="snippet-title">{snip.title}</span>
                  {snip.link && (
                    <a href={snip.link} target="_blank" rel="noreferrer" className="snippet-link">
                      {snip.link}
                    </a>
                  )}
                </div>
                <p className="snippet-desc">{snip.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. COLLAPSIBLE AGENT THOUGHT LOGS */}
      {run.thoughtLogs && run.thoughtLogs.length > 0 && (
        <div className="collapsible-logs">
          <div className="logs-header" onClick={() => setLogsExpanded(!logsExpanded)}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="cpu" color="var(--color-primary)" size={20} />
              INTERNAL AGENT THOUGHT LOGS
            </h3>
            <span style={{ fontSize: '1.2rem', transform: logsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ▶
            </span>
          </div>
          {logsExpanded && (
            <div className="logs-content">
              {run.thoughtLogs.map((log, index) => (
                <div key={index} className="log-line">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
