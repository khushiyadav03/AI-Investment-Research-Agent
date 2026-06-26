import React from 'react';
import Icon from './Icon';

export default function StatusTracker({ currentLog, logs }) {
  // Define our 6 steps corresponding to LangGraph nodes
  const steps = [
    {
      id: 1,
      label: "Ticker Resolution",
      desc: "Resolving company name to a stock market ticker symbol.",
      detect: (log) => log.includes("ticker") || log.includes("Ticker")
    },
    {
      id: 2,
      label: "Financial Statements Fetch",
      desc: "Downloading cash flow sheets, balance sheets, and key ratios.",
      detect: (log) => log.includes("financial") || log.includes("ratios") || log.includes("statements") || log.includes("chart")
    },
    {
      id: 3,
      label: "Web Sentiment & competitor Research",
      desc: "Scraping news headlines, market drivers, and competitor threats.",
      detect: (log) => log.includes("web research") || log.includes("articles") || log.includes("scraping")
    },
    {
      id: 4,
      label: "AI Fundamentals Analysis",
      desc: "Synthesizing debt safety, margin strength, and profitability.",
      detect: (log) => log.includes("fundamentals") || log.includes("balance sheet") || log.includes("analysis:")
    },
    {
      id: 5,
      label: "Sentiment & Risk Assessment",
      desc: "Evaluating competitor pressure, regulatory hurdles, and news sentiment.",
      detect: (log) => log.includes("sentiment/risk") || log.includes("competitor dynamics") || log.includes("sentiment:")
    },
    {
      id: 6,
      label: "CIO Decision Synthesis",
      desc: "Reviewing all metrics to build the final Invest/Pass thesis.",
      detect: (log) => log.includes("synthesis") || log.includes("CIO") || log.includes("recommendation")
    }
  ];

  // Determine current step index based on logs
  let activeStepId = 1;
  steps.forEach(step => {
    // If any log in the history matches this step, we've reached it
    const hasMatched = logs.some(l => step.detect(l)) || (currentLog && step.detect(currentLog));
    if (hasMatched) {
      activeStepId = Math.max(activeStepId, step.id);
    }
  });

  return (
    <div className="stepper">
      {steps.map((step) => {
        const isActive = step.id === activeStepId;
        const isCompleted = step.id < activeStepId;
        
        let statusClass = "pending";
        if (isActive) statusClass = "active";
        if (isCompleted) statusClass = "completed";

        return (
          <div key={step.id} className={`step-item ${statusClass}`}>
            <div className="step-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isCompleted ? <Icon name="check" size={14} color="#030408" /> : step.id}
            </div>
            <div className="step-content">
              <div className="step-label">{step.label}</div>
              <div className="step-desc">
                {isActive && currentLog ? (
                  <span style={{ color: '#60a5fa', fontWeight: '500' }}>▶ {currentLog}</span>
                ) : (
                  step.desc
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
