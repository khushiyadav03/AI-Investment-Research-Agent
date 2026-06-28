import React, { useState, useEffect } from 'react';
import HistorySidebar from './components/HistorySidebar';
import StatusTracker from './components/StatusTracker';
import Dashboard from './components/Dashboard';
import CompanyNotFound from './components/CompanyNotFound';
import CompanyAmbiguous from './components/CompanyAmbiguous';
import LimitedDataReport from './components/LimitedDataReport';
import Icon from './components/Icon';

export default function App() {
  const [searchTerm, setSearchTerm]       = useState('');
  const [bypassCache, setBypassCache]     = useState(false);
  const [activeRun, setActiveRun]         = useState(null);
  const [runsHistory, setRunsHistory]     = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [currentLog, setCurrentLog]       = useState('');
  const [logsList, setLogsList]           = useState([]);
  const [error, setError]                 = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/_./backend/api';

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
    try {
      const response = await fetch(`${API_URL}/history`);
      if (response.ok) {
        const serverRuns = await response.json();
        const merged = [...serverRuns];
        for (const local of localRuns) {
          if (!merged.some(m => m.id === local.id)) {
            merged.push({ id: local.id, companyName: local.companyName, ticker: local.ticker,
              decision: local.decision, confidence: local.confidence, riskRating: local.riskRating,
              feedbackStatus: local.feedbackStatus || 'none', createdAt: local.createdAt });
          }
        }
        merged.sort((a, b) => b.id - a.id);
        setRunsHistory(merged);
      } else { setRunsHistory(localRuns); }
    } catch { setRunsHistory(localRuns); }
  };

  const handleSearchSubmit = async (e, overrideTerm = null) => {
    if (e?.preventDefault) e.preventDefault();
    const term = (overrideTerm || searchTerm).trim();
    if (!term) return;
    if (overrideTerm) setSearchTerm(overrideTerm);

    setIsLoading(true); setError(''); setActiveRun(null);
    setCurrentLog('Starting connection...'); setLogsList(['Starting connection...']); setFeedbackMessage('');

    try {
      const response = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: term, bypassCache: overrideTerm ? true : bypassCache }),
      });
      if (!response.ok) throw new Error(`Failed to initiate research (status ${response.status})`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line || !line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'log') {
              setCurrentLog(payload.message);
              setLogsList(prev => [...prev, payload.message]);
            } else if (payload.type === 'result') {
              setActiveRun(payload.result); setIsLoading(false);
              const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
              localStorage.setItem('insideinvest_runs', JSON.stringify(
                [payload.result, ...localRuns.filter(r => r.id !== payload.result.id)]
              ));
              fetchHistory();
            } else if (payload.type === 'error') {
              setError(payload.message); setIsLoading(false);
            }
          } catch (jsonErr) { console.error('Stream parse error:', jsonErr); }
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected network error occurred. Please verify the backend is running on port 3001.');
      setIsLoading(false);
    }
  };

  const handleSelectRun = async (runId) => {
    setError(''); setIsLoading(false); setFeedbackMessage('');
    const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
    const localRun = localRuns.find(r => r.id === runId);
    if (localRun) {
      setActiveRun(localRun); setSearchTerm(localRun.companyName);
      try {
        const res = await fetch(`${API_URL}/history/${runId}`);
        if (res.ok) {
          const data = await res.json(); setActiveRun(data);
          localStorage.setItem('insideinvest_runs', JSON.stringify(localRuns.map(r => r.id === runId ? data : r)));
        }
      } catch {}
      return;
    }
    try {
      const res = await fetch(`${API_URL}/history/${runId}`);
      if (!res.ok) throw new Error('Failed to retrieve research details.');
      const data = await res.json();
      setActiveRun(data); setSearchTerm(data.companyName);
      localStorage.setItem('insideinvest_runs', JSON.stringify([data, ...localRuns.filter(r => r.id !== runId)]));
    } catch (err) { setError(err.message); }
  };

  const handleNewSearch = () => { setActiveRun(null); setSearchTerm(''); setError(''); setFeedbackMessage(''); };

  const handleSubmitFeedback = async (runId, status, comment) => {
    if (activeRun?.id === runId) {
      const updatedRun = { ...activeRun, feedbackStatus: status, feedbackComment: comment };
      setActiveRun(updatedRun);
      const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
      localStorage.setItem('insideinvest_runs', JSON.stringify(localRuns.map(r => r.id === runId ? updatedRun : r)));
    }
    setRunsHistory(prev => prev.map(r => r.id === runId ? { ...r, feedbackStatus: status } : r));
    try {
      const res = await fetch(`${API_URL}/history/${runId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment }),
      });
      if (res.ok) { setFeedbackMessage('Audit feedback saved successfully!'); fetchHistory(); }
      else { const e = await res.json(); throw new Error(e.error || 'Failed to update feedback.'); }
    } catch (err) { setError(`Failed to save feedback: ${err.message}`); }
  };

  const handleSuggestionSelect = (companyName) => handleSearchSubmit(null, companyName);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-wrap">
          <div className="loading-card">
            <div className="loader-spinner"></div>
            <div className="loading-card-title">Conducting Investment Research…</div>
            <StatusTracker currentLog={currentLog} logs={logsList} />
          </div>
          <div className="skeleton-grid">
            <div className="skeleton-block sk-panel-a"></div>
            <div className="content-stack">
              <div className="skeleton-block sk-hero"></div>
              <div className="skeleton-block sk-panel-b"></div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-banner">
          <Icon name="alert" size={18} color="var(--color-pass)" />
          <div>
            <div className="error-banner-title">Analysis Failed</div>
            <div className="error-banner-msg">{error}</div>
          </div>
        </div>
      );
    }

    if (activeRun) {
      const status = activeRun.resolutionStatus || 'resolved';
      if (status === 'not_found')   return <CompanyNotFound    run={activeRun} onSelectSuggestion={handleSuggestionSelect} />;
      if (status === 'ambiguous')   return <CompanyAmbiguous   run={activeRun} onSelectSuggestion={handleSuggestionSelect} />;
      if (status === 'limited_data') return <LimitedDataReport run={activeRun} />;
      return <Dashboard run={activeRun} onSubmitFeedback={handleSubmitFeedback} feedbackMessage={feedbackMessage} />;
    }

    return (
      <div>
        <div className="landing-hero">
          <div className="landing-hero-badge">
            <Icon name="activity" size={12} color="var(--color-brand)" /> AI-Powered · Free Data Sources
          </div>
          <h1 className="landing-hero-title">
            Institutional Research,<br /><span>Without the Bloomberg Terminal</span>
          </h1>
          <p className="landing-hero-sub">
            Enter any public or private company name. The AI agent resolves, scrapes, and analyzes
            corporate data to produce an Invest or Pass recommendation.
          </p>
        </div>
        <div className="landing-steps">
          <div className="landing-step-card">
            <div className="landing-step-num">01</div>
            <div className="landing-step-title">Ticker & Financials</div>
            <p className="landing-step-desc">Identifies stock tickers via Yahoo Finance and pulls income statements, D/E ratios, margins, FCF, and 1-year price charts.</p>
          </div>
          <div className="landing-step-card">
            <div className="landing-step-num">02</div>
            <div className="landing-step-title">Web Due Diligence</div>
            <p className="landing-step-desc">Scrapes DuckDuckGo news with Cheerio to evaluate competitor strategies, market share, and regulatory headwinds.</p>
          </div>
          <div className="landing-step-card">
            <div className="landing-step-num">03</div>
            <div className="landing-step-title">CIO Recommendation</div>
            <p className="landing-step-desc">Synthesizes quantitative metrics and sentiment via LLM JSON schemas to produce a detailed Invest/Pass thesis with confidence and risk tags.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-closed'}`}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <HistorySidebar
        runs={runsHistory}
        activeRunId={activeRun?.id ?? null}
        onSelectRun={handleSelectRun}
        onNewSearch={handleNewSearch}
        onToggleSidebar={() => setSidebarOpen(false)}
      />

      {/* Main panel */}
      <div className="main-panel">
        {/* Top navbar */}
        <nav className="top-navbar">
          <button className="navbar-hamburger" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" size={20} />
          </button>

          <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
            <div className="navbar-search-wrap">
              <Icon name="search" size={15} color="var(--text-muted)" />
              <input
                className="navbar-search-input"
                placeholder="Search company (e.g. Nvidia, Tesla, Stripe…)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <button className="navbar-search-btn" type="submit" disabled={isLoading || !searchTerm.trim()}>
                {isLoading ? 'Analyzing…' : 'Research'}
              </button>
            </div>
          </form>

          <div className="navbar-right">
            <label className="bypass-cache-label">
              <input type="checkbox" checked={bypassCache} onChange={e => setBypassCache(e.target.checked)} />
              <span>Fresh analysis</span>
            </label>

            <div className="navbar-divider" />

            <button className="navbar-icon-btn" title="Notifications">
              <Icon name="alert" size={17} />
              <span className="navbar-notification-dot" />
            </button>
            <button className="navbar-icon-btn" title="Messages">
              <Icon name="message" size={17} />
            </button>

            <div className="navbar-divider" />

            <div className="navbar-user">
              <div className="navbar-avatar">AI</div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">Analyst</span>
                <span className="navbar-user-role">CIO Mode</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="page-content">
          <div>
            <h1 className="page-heading">
              {activeRun ? (activeRun.companyName || 'Research Report') : 'Research'}
            </h1>
            <p className="page-subheading">
              {activeRun
                ? `AI Investment Analysis · ${activeRun.ticker ? activeRun.ticker + ' · ' : ''}${activeRun.createdAt ? new Date(activeRun.createdAt).toLocaleDateString() : ''}`
                : 'Comprehensive corporate due diligence, fundamental analysis & news sentiment.'}
            </p>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
