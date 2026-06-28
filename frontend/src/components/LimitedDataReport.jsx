import React, { useState } from 'react';
import Icon from './Icon';

export default function LimitedDataReport({ run }) {
  const [logsExpanded, setLogsExpanded] = useState(false);
  const company = run.resolvedCompany?.companyName || run.companyName;
  const ticker = run.resolvedCompany?.ticker || run.ticker;

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

      if (text.startsWith('## ')) {
        return <h3 key={index}>{replaceInlineMarkdown(text.slice(3))}</h3>;
      }
      if (text.startsWith('# ')) {
        return <h2 key={index}>{replaceInlineMarkdown(text.slice(2))}</h2>;
      }
      if (text.startsWith('- ')) {
        const lines = text.split('\n');
        return (
          <ul key={index}>
            {lines.map((line, idx) => (
              <li key={idx}>{replaceInlineMarkdown(line.replace(/^-\s+/, ''))}</li>
            ))}
          </ul>
        );
      }
      return <p key={index}>{replaceInlineMarkdown(text)}</p>;
    });
  };

  const hasQualitative =
    (run.fundamentalAnalysis?.strengths?.length > 0) ||
    (run.fundamentalAnalysis?.metricsSummary) ||
    (run.sentimentAnalysis?.marketSentimentSummary);

  return (
    <div className="report-layout">
      <div className="resolution-panel limited-data">
        <div className="resolution-icon-wrap">
          <Icon name="database" size={36} color="#f59e0b" />
        </div>

        <div className="identified-badge">
          Identified as: <strong>{company}</strong>
          {ticker && <span className="ticker-badge-large">{ticker}</span>}
        </div>

        <h2 className="resolution-title">Limited Data Available</h2>

        <p className="resolution-message">
          <strong>{company}</strong> was identified, but sufficient financial data isn't available
          to generate an investment decision (e.g. it may be privately held or not publicly traded).
        </p>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header">
          <h3 className="panel-title">
            <Icon name="activity" color="var(--color-primary)" size={20} />
            QUALITATIVE RESEARCH SUMMARY
          </h3>
        </div>
        <div className="reasoning-text">
          {renderMarkdown(run.reasoning)}
        </div>
      </div>

      {hasQualitative && (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="shield" color="var(--color-primary)" size={20} />
              AVAILABLE INFORMATION
            </h3>
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
              <ul>
                {run.fundamentalAnalysis.strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {run.searchResults && run.searchResults.length > 0 && (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Icon name="globe" color="var(--color-primary)" size={20} />
              SOURCE CITATIONS
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
                <div key={index} className="log-line">{log}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
