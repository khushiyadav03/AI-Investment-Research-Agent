import React from 'react';
import Icon from './Icon';

export default function CompanyNotFound({ run, onSelectSuggestion }) {
  const [selectedName, setSelectedName] = React.useState(null);

  const userInput        = run.originalUserInput || run.companyName;
  const alternatives     = run.companyResolution?.alternativeMatches || [];
  const resolutionReason = run.companyResolution?.reasoning;

  const handleSelect = name => {
    setSelectedName(name);
    onSelectSuggestion(name);
  };

  return (
    <div className="resolution-panel not-found" style={{ marginTop: 0 }}>
      <div className="resolution-icon-wrap">
        <Icon name="search" size={38} color="var(--color-pass)" />
      </div>

      <h2 className="resolution-title">Company Not Found</h2>

      <p className="resolution-message">
        We couldn't confidently identify a real company matching{' '}
        <strong>"{userInput}"</strong>. Please check the spelling or try the official company or ticker name.
      </p>

      {resolutionReason && (
        <div className="resolution-reasoning">
          <Icon name="info" size={15} color="var(--color-brand)" />
          <span>{resolutionReason}</span>
        </div>
      )}

      {selectedName ? (
        <div className="resolution-searching">
          <div className="loader-spinner" style={{ width: 28, height: 28, margin: '0 auto' }}></div>
          <p>Researching <strong>{selectedName}</strong>…</p>
        </div>
      ) : (
        alternatives.length > 0 && (
          <div>
            <p className="suggestions-label">Did you mean one of these?</p>
            <div className="suggestion-chips">
              {alternatives.map(name => (
                <button key={name} type="button" className="suggestion-chip" onClick={() => handleSelect(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {run.thoughtLogs?.length > 0 && (
        <details className="resolution-logs">
          <summary>Resolution debug logs</summary>
          <div className="logs-content" style={{ marginTop: 8, borderRadius: 'var(--radius-sm)' }}>
            {run.thoughtLogs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
          </div>
        </details>
      )}
    </div>
  );
}
