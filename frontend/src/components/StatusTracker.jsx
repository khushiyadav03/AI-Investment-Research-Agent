import React from 'react';
import Icon from './Icon';

const STEPS = [
  { id: 1, label: 'Company Resolution',      desc: 'Identifying the company and verifying it exists.',
    detect: l => l.includes('Resolving company') || l.includes('resolution') || l.includes('Verified company') || l.includes('Could not verify') },
  { id: 2, label: 'Ticker Resolution',       desc: 'Mapping company name to a stock market ticker symbol.',
    detect: l => l.includes('ticker') || l.includes('Ticker') },
  { id: 3, label: 'Financial Statements',    desc: 'Downloading cash flow, balance sheet, and key ratios.',
    detect: l => l.includes('financial') || l.includes('ratios') || l.includes('statements') || l.includes('chart') },
  { id: 4, label: 'Web Sentiment Research',  desc: 'Scraping news headlines, market drivers, and competitor threats.',
    detect: l => l.includes('web research') || l.includes('articles') || l.includes('scraping') },
  { id: 5, label: 'Fundamentals Analysis',   desc: 'Synthesizing debt safety, margin strength, and profitability.',
    detect: l => l.includes('fundamentals') || l.includes('balance sheet') || l.includes('analysis:') },
  { id: 6, label: 'Sentiment & Risk',        desc: 'Evaluating competitor pressure, regulatory hurdles, and news.',
    detect: l => l.includes('sentiment/risk') || l.includes('competitor dynamics') || l.includes('sentiment:') },
  { id: 7, label: 'CIO Decision Synthesis',  desc: 'Building the final Invest / Pass thesis.',
    detect: l => l.includes('synthesis') || l.includes('CIO') || l.includes('recommendation') || l.includes('Qualitative') },
];

export default function StatusTracker({ currentLog, logs }) {
  let activeId = 1;
  STEPS.forEach(step => {
    const matched = logs.some(l => step.detect(l)) || (currentLog && step.detect(currentLog));
    if (matched) activeId = Math.max(activeId, step.id);
  });

  return (
    <div className="stepper">
      {STEPS.map(step => {
        const isActive    = step.id === activeId;
        const isDone      = step.id < activeId;
        const rowClass    = `step-row${isActive ? ' active' : isDone ? ' done' : ''}`;
        return (
          <div key={step.id} className={rowClass}>
            <div className="step-dot">
              {isDone ? <Icon name="check" size={13} color="#FFFFFF" /> : step.id}
            </div>
            <div>
              <div className="step-label">{step.label}</div>
              {isActive && currentLog
                ? <div className="step-active-log">▶ {currentLog}</div>
                : <div className="step-desc">{step.desc}</div>
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}
