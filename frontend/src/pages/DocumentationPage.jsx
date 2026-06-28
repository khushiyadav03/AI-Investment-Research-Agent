import React, { useState } from 'react';
import Icon from '../components/Icon';

const sections = [
  {
    id: 'overview',
    title: 'What is InsideInvest?',
    icon: 'activity',
    content: `InsideInvest is an AI-powered investment research agent that automates the workflow of a CIO analyst. Enter any public or private company name and the agent resolves, scrapes, and analyzes corporate data to produce a structured Invest or Pass recommendation — complete with confidence score, risk rating, financial metrics, and a full SWOT breakdown.`
  },
  {
    id: 'pipeline',
    title: 'How the AI Pipeline Works',
    icon: 'cpu',
    steps: [
      { num: '01', title: 'Company Resolution', desc: 'The LLM identifies the correct company from your input, handling typos and abbreviations. It cross-checks against Yahoo Finance and web search to verify the company exists.' },
      { num: '02', title: 'Ticker Resolution', desc: 'If the company is publicly traded, its stock ticker symbol is resolved (e.g. "Apple" → AAPL).' },
      { num: '03', title: 'Financial Statements', desc: 'Downloads balance sheet data, income statements, key ratios (P/E, D/E, margins), free cash flow, and 1-year historical price charts from Yahoo Finance — no paid API required.' },
      { num: '04', title: 'Web Due Diligence', desc: 'Scrapes DuckDuckGo search results using Cheerio to gather recent news, competitor activity, regulatory developments, and market sentiment signals.' },
      { num: '05', title: 'Fundamentals Analysis', desc: 'The LLM evaluates solvency, leverage, cash flows, margins, and valuation multiples to produce a SWOT strengths/weaknesses breakdown.' },
      { num: '06', title: 'Sentiment & Risk', desc: 'Analyzes news sentiment, competitor pressures, and industry headwinds to produce SWOT opportunities/threats.' },
      { num: '07', title: 'CIO Decision Synthesis', desc: 'Integrates all financial stats and qualitative signals into a final Invest or Pass decision with confidence percentage, risk rating, and detailed reasoning.' },
    ]
  },
  {
    id: 'decisions',
    title: 'Understanding the Outputs',
    icon: 'trending',
    items: [
      { label: 'INVEST', desc: 'The AI recommends this company as a potential investment opportunity based on the available data.' },
      { label: 'PASS', desc: 'The AI recommends avoiding this company at current prices or due to insufficient data quality.' },
      { label: 'UNRESOLVED', desc: 'The company could not be confidently identified. Suggestions are shown — click one to re-run with a confirmed name.' },
      { label: 'Confidence %', desc: 'How certain the AI is about its recommendation, from 0–100%. Below 50% indicates low data quality or high uncertainty.' },
      { label: 'Risk Rating', desc: 'Low / Medium / High — reflects debt levels, volatility, and competitive threats combined.' },
    ]
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    icon: 'shield',
    content: `The Watchlist lets you save companies for quick reference. After any research run, click the "+ Watchlist" button on the result card to save it. From the Watchlist page you can re-run research on any saved company. Watchlist data is stored in Appwrite database and tied to your account.`
  },
  {
    id: 'cache',
    title: 'Cache & Fresh Analysis',
    icon: 'database',
    content: `Research results are cached in the SQLite database for 7 days. If you search the same company within 7 days, the cached result loads instantly. To force a new AI run (useful when market conditions change), check "Force fresh analysis" before searching.`
  },
  {
    id: 'limitations',
    title: 'Known Limitations',
    icon: 'alert',
    items: [
      { label: 'Private companies', desc: 'No public financial filings are available, so only a qualitative summary is generated.' },
      { label: 'Data freshness', desc: 'Financial data is pulled live from Yahoo Finance at the time of the run — it reflects the most recent available filings, not real-time prices.' },
      { label: 'LLM accuracy', desc: 'The AI synthesis is based on free public data sources. It is for research and educational purposes only — not financial advice.' },
      { label: 'Rate limits', desc: 'The agent uses Gemini API with 5-key rotation. If all keys hit daily limits, the run will fail with a quota error. Try again after 24 hours or add more API keys.' },
    ]
  },
];

export default function DocumentationPage() {
  const [open, setOpen] = useState({ overview: true });

  const toggle = (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760 }}>
      <div>
        <h1 className="page-heading">Documentation</h1>
        <p className="page-subheading">Everything you need to understand and use InsideInvest effectively.</p>
      </div>

      {sections.map(section => (
        <div key={section.id} className="card" style={{ overflow: 'hidden' }}>
          {/* Accordion header */}
          <button
            className="logs-toggle"
            onClick={() => toggle(section.id)}
            style={{ padding: '16px 24px' }}
          >
            <span className="logs-toggle-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <div className="card-title-icon"><Icon name={section.icon} size={15} color="var(--color-brand)" /></div>
              {section.title}
            </span>
            <span className={`logs-toggle-arrow${open[section.id] ? ' open' : ''}`}>▶</span>
          </button>

          {open[section.id] && (
            <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--border)' }}>
              {section.content && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingTop: 16 }}>
                  {section.content}
                </p>
              )}

              {section.steps && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
                  {section.steps.map(step => (
                    <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{
                        minWidth: 32, height: 32, borderRadius: 8,
                        background: 'var(--grad-brand-soft)', border: '1px solid rgba(255,138,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-brand)', flexShrink: 0,
                      }}>{step.num}</div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{step.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {section.items && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                  {section.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand)', background: 'var(--grad-brand-soft)', border: '1px solid rgba(255,138,0,0.2)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.label}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
