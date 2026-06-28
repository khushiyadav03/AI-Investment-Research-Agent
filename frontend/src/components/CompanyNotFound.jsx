import React from 'react';
import Icon from './Icon';

export default function CompanyNotFound({ run, onSelectSuggestion }) {
  const [selectedName, setSelectedName] = React.useState(null);

  const userInput = run.originalUserInput || run.companyName;
  const alternatives = run.companyResolution?.alternativeMatches || [];
  const resolutionReasoning = run.companyResolution?.reasoning;

  const handleSelect = (name) => {
    setSelectedName(name);
    onSelectSuggestion(name);
  };

  return (
    <div className="resolution-panel not-found">
      <div className="resolution-icon-wrap">
        <Icon name="search" size={40} color="var(--color-pass)" />
      </div>

      <h2 className="resolution-title">Company Not Found</h2>

      <p className="resolution-message">
        We couldn't confidently identify a real company matching{' '}
        <strong>"{userInput}"</strong>. Please check the spelling or try the official company or ticker name.
      </p>

      {resolutionReasoning && (
        <div className="resolution-reasoning">
          <Icon name="info" size={16} color="var(--color-primary)" />
          <span>{resolutionReasoning}</span>
        </div>
      )}

      {selectedName ? (
        <div className="resolution-searching">
          <div className="loader-animation" style={{ width: 28, height: 28, margin: '0 auto 10px' }}></div>
          <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Researching <strong>{selectedName}</strong>…
          </p>
        </div>
      ) : (
        alternatives.length > 0 && (
          <div className="resolution-suggestions">
            <p className="suggestions-label">Did you mean one of these?</p>
            <div className="suggestion-chips">
              {alternatives.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => handleSelect(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {run.thoughtLogs && run.thoughtLogs.length > 0 && (
        <details className="resolution-logs">
          <summary>Resolution debug logs</summary>
          <div className="logs-content">
            {run.thoughtLogs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
