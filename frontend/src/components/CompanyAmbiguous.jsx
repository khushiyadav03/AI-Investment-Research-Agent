import React from 'react';
import Icon from './Icon';

export default function CompanyAmbiguous({ run, onSelectSuggestion }) {
  const [selectedName, setSelectedName] = React.useState(null);

  const userInput = run.originalUserInput || run.companyName;
  const resolution = run.companyResolution || {};
  const resolved = run.resolvedCompany || {};
  const primaryName = resolved.companyName || resolution.companyName;
  const alternatives = resolution.alternativeMatches || [];
  const isPublic = resolution.isPubliclyListed !== false;

  const allOptions = [
    primaryName,
    ...alternatives.filter((a) => a !== primaryName)
  ].filter(Boolean);

  const handleSelect = (name) => {
    setSelectedName(name);
    onSelectSuggestion(name);
  };

  return (
    <div className="resolution-panel ambiguous">
      <div className="resolution-icon-wrap">
        <Icon name="alert" size={40} color="#f59e0b" />
      </div>

      <h2 className="resolution-title">Which Company Did You Mean?</h2>

      <p className="resolution-message">
        Your search for <strong>"{userInput}"</strong> matches multiple companies or needs confirmation before we proceed.
      </p>

      {resolution.reasoning && (
        <div className="resolution-reasoning">
          <Icon name="info" size={16} color="var(--color-primary)" />
          <span>{resolution.reasoning}</span>
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
        <>
          {primaryName && (
            <div className="ambiguous-primary">
              <p className="suggestions-label">Most likely match:</p>
              <button
                type="button"
                className="suggestion-chip primary"
                onClick={() => handleSelect(primaryName)}
              >
                {primaryName}
                {resolved.ticker && ` (${resolved.ticker})`}
                {!isPublic && ' — private/unlisted'}
              </button>
              {!isPublic && (
                <p className="listing-note">
                  This company is not publicly listed, so financial research will be limited.
                </p>
              )}
            </div>
          )}

          {allOptions.length > 1 && (
            <div className="resolution-suggestions">
              <p className="suggestions-label">Other possible matches:</p>
              <div className="suggestion-chips">
                {allOptions.slice(1).map((name) => (
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
          )}
        </>
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
