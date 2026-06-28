import React from 'react';
import Icon from './Icon';

const STEPS = [
  {
    id: 1,
    label: 'Company Resolution',
    desc: 'Identifying the company and verifying it exists.',
    detect: l =>
      l.includes('Initializing') ||
      l.includes('Resolving company') ||
      l.includes('resolution') ||
      l.includes('LLM resolution') ||
      l.includes('Cross-checking') ||
      l.includes('Verified company') ||
      l.includes('Could not verify') ||
      l.includes('verifying private') ||
      l.includes('Ambiguous') ||
      l.includes('Company not found'),
  },
  {
    id: 2,
    label: 'Ticker Resolution',
    desc: 'Mapping company name to a stock market ticker symbol.',
    detect: l =>
      l.includes('ticker') ||
      l.includes('Ticker') ||
      l.includes('Searching for company ticker'),
  },
  {
    id: 3,
    label: 'Financial Statements',
    desc: 'Downloading cash flow, balance sheet, and key ratios.',
    detect: l =>
      l.includes('financial') ||
      l.includes('Financial') ||
      l.includes('Downloading') ||
      l.includes('historical') ||
      l.includes('chart') ||
      l.includes('Fetching') ||
      l.includes('Skipping financial'),
  },
  {
    id: 4,
    label: 'Web Sentiment Research',
    desc: 'Scraping news headlines, market drivers, and competitor threats.',
    detect: l =>
      l.includes('web research') ||
      l.includes('Web research') ||
      l.includes('Conducting') ||
      l.includes('articles') ||
      l.includes('scraping') ||
      l.includes('Retrieved'),
  },
  {
    id: 5,
    label: 'Fundamentals Analysis',
    desc: 'Synthesizing debt safety, margin strength, and profitability.',
    detect: l =>
      l.includes('fundamentals') ||
      l.includes('Fundamentals') ||
      l.includes('Analyzing company') ||
      l.includes('balance sheet'),
  },
  {
    id: 6,
    label: 'Sentiment & Risk Assessment',
    desc: 'Evaluating competitor pressure, regulatory hurdles, and news sentiment.',
    detect: l =>
      l.includes('sentiment') ||
      l.includes('Sentiment') ||
      l.includes('competitor') ||
      l.includes('risk assessment') ||
      l.includes('market sentiment'),
  },
  {
    id: 7,
    label: 'CIO Decision Synthesis',
    desc: 'Building the final Invest / Pass thesis.',
    detect: l =>
      l.includes('synthesis') ||
      l.includes('Synthesis') ||
      l.includes('synthesiz') ||
      l.includes('CIO') ||
      l.includes('final investment') ||
      l.includes('Qualitative') ||
      l.includes('Compiling') ||
      l.includes('Saving research'),
  },
];

export default function StatusTracker({ currentLog, logs }) {
  // Determine the highest step reached by scanning all logs + current log
  let activeId = 1;
  const allLogs = currentLog ? [...logs, currentLog] : logs;

  STEPS.forEach(step => {
    if (allLogs.some(l => step.detect(l))) {
      activeId = Math.max(activeId, step.id);
    }
  });

  return (
    <div className="stepper">
      {STEPS.map(step => {
        const isActive = step.id === activeId;
        const isDone   = step.id < activeId;
        return (
          <div key={step.id} className={`step-row${isActive ? ' active' : isDone ? ' done' : ''}`}>
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
