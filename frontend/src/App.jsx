import React, { useState, useEffect } from 'react';
import HistorySidebar from './components/HistorySidebar';
import StatusTracker from './components/StatusTracker';
import Dashboard from './components/Dashboard';
import Icon from './components/Icon';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [bypassCache, setBypassCache] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [runsHistory, setRunsHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLog, setCurrentLog] = useState('');
  const [logsList, setLogsList] = useState([]);
  const [error, setError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dynamic API URL for local dev vs production Vercel
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/_./backend/api';

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    // Load local history from localStorage as the baseline/fallback (crucial for Vercel persistence)
    const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
    
    try {
      const response = await fetch(`${API_URL}/history`);
      if (response.ok) {
        const serverRuns = await response.json();
        
        // Merge server runs and local storage runs, avoiding duplicates by matching ID
        const merged = [...serverRuns];
        for (const local of localRuns) {
          if (!merged.some(m => m.id === local.id)) {
            merged.push({
              id: local.id,
              companyName: local.companyName,
              ticker: local.ticker,
              decision: local.decision,
              confidence: local.confidence,
              riskRating: local.riskRating,
              feedbackStatus: local.feedbackStatus || 'none',
              createdAt: local.createdAt
            });
          }
        }
        
        // Sort history by ID descending
        merged.sort((a, b) => b.id - a.id);
        setRunsHistory(merged);
      } else {
        setRunsHistory(localRuns);
      }
    } catch (err) {
      console.error("Failed to load history list:", err);
      // Fallback to local storage on network/server error
      setRunsHistory(localRuns);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError('');
    setActiveRun(null);
    setCurrentLog('Starting connection...');
    setLogsList(['Starting connection...']);
    setFeedbackMessage('');

    try {
      const response = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: searchTerm,
          bypassCache
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate research (status ${response.status})`);
      }

      // Stream the response reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split by Double Newlines (standard SSE data format)
        const parts = buffer.split('\n\n');
        // Keep the last partial line in the buffer
        buffer = parts.pop();

        for (const part of parts) {
          const line = part.trim();
          if (!line || !line.startsWith('data: ')) continue;
          
          try {
            const rawJson = line.slice(6); // Remove 'data: ' prefix
            const payload = JSON.parse(rawJson);

            if (payload.type === 'log') {
              setCurrentLog(payload.message);
              setLogsList(prev => [...prev, payload.message]);
            } else if (payload.type === 'result') {
              setActiveRun(payload.result);
              setIsLoading(false);
              
              // Save run to localStorage to ensure it is kept persistently on ephemeral serverless hosts
              const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
              const updatedRuns = [payload.result, ...localRuns.filter(r => r.id !== payload.result.id)];
              localStorage.setItem('insideinvest_runs', JSON.stringify(updatedRuns));
              
              // Reload sidebar list
              fetchHistory();
            } else if (payload.type === 'error') {
              setError(payload.message);
              setIsLoading(false);
            }
          } catch (jsonErr) {
            console.error("Error parsing stream chunk:", jsonErr, line);
          }
        }
      }
    } catch (err) {
      console.error("Search execution error:", err);
      setError(err.message || "An unexpected network error occurred. Please verify backend is running on port 3001.");
      setIsLoading(false);
    }
  };

  const handleSelectRun = async (runId) => {
    setError('');
    setIsLoading(false);
    setFeedbackMessage('');
    
    // Check if we have the full details in localStorage first (crucial for loading runs when the server restarts)
    const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
    const localRun = localRuns.find(r => r.id === runId);
    
    if (localRun) {
      setActiveRun(localRun);
      setSearchTerm(localRun.companyName);
      
      // Try to fetch from server in background to sync any changes (like server-saved feedback)
      try {
        const response = await fetch(`${API_URL}/history/${runId}`);
        if (response.ok) {
          const data = await response.json();
          setActiveRun(data);
          // Sync changes back to localStorage
          const updated = localRuns.map(r => r.id === runId ? data : r);
          localStorage.setItem('insideinvest_runs', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn("Background history sync failed:", err);
      }
      return;
    }
    
    // Fallback if not found in localStorage
    try {
      const response = await fetch(`${API_URL}/history/${runId}`);
      if (!response.ok) {
        throw new Error("Failed to retrieve research details.");
      }
      const data = await response.json();
      setActiveRun(data);
      setSearchTerm(data.companyName);
      
      // Save to localStorage for future offline/instant access
      const updated = [data, ...localRuns.filter(r => r.id !== runId)];
      localStorage.setItem('insideinvest_runs', JSON.stringify(updated));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNewSearch = () => {
    setActiveRun(null);
    setSearchTerm('');
    setError('');
    setFeedbackMessage('');
  };

  const handleSubmitFeedback = async (runId, status, comment) => {
    // 1. Update in active state and local storage instantly for responsive UI
    if (activeRun && activeRun.id === runId) {
      const updatedRun = { ...activeRun, feedbackStatus: status, feedbackComment: comment };
      setActiveRun(updatedRun);
      
      const localRuns = JSON.parse(localStorage.getItem('insideinvest_runs') || '[]');
      const updated = localRuns.map(r => r.id === runId ? updatedRun : r);
      localStorage.setItem('insideinvest_runs', JSON.stringify(updated));
    }
    
    // Update runsHistory list locally
    setRunsHistory(prev => prev.map(r => r.id === runId ? { ...r, feedbackStatus: status } : r));

    try {
      const response = await fetch(`${API_URL}/history/${runId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, comment }),
      });

      if (response.ok) {
        setFeedbackMessage("Audit feedback saved successfully!");
        // Refresh sidebar
        fetchHistory();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update feedback.");
      }
    } catch (err) {
      console.error("Error posting feedback:", err);
      setError(`Failed to save feedback: ${err.message}`);
    }
  };

  return (
    <div className={`app-container ${sidebarOpen ? '' : 'sidebar-closed'}`}>
      {/* Mobile Sidebar overlay backdrop */}
      {sidebarOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* 1. Sidebar history logger wrapper */}
      <div className="sidebar-wrapper">
        <HistorySidebar 
          runs={runsHistory}
          activeRunId={activeRun ? activeRun.id : null}
          onSelectRun={handleSelectRun}
          onNewSearch={handleNewSearch}
          onToggleSidebar={() => setSidebarOpen(false)}
        />
      </div>

      {/* 2. Main Search & Report Dashboard */}
      <div className="main-content">
        <header className="main-header">
          <div className="title-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  title="Expand Research History"
                  className="sidebar-open-btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '8px',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon name="menu" size={20} />
                </button>
              )}
              <h1 className="main-title" style={{ margin: 0 }}>AI Investment Research Agent</h1>
            </div>
            <p className="main-subtitle">
              Conduct comprehensive corporate due diligence, fundamental analysis, and news sentiment checks.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit}>
            <div className="search-card">
              <input
                type="text"
                className="search-input"
                placeholder="Enter company name (e.g. Nvidia, Tesla, Stripe, local bakery...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="search-btn"
                disabled={isLoading || !searchTerm.trim()}
              >
                {isLoading ? 'Analyzing...' : 'Research Company'}
              </button>
            </div>
            <div className="options-row">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={bypassCache} 
                  onChange={(e) => setBypassCache(e.target.checked)}
                />
                Force fresh analysis (Bypass SQLite cache)
              </label>
            </div>
          </form>
        </header>

        {/* Dynamic Area: Loading status tracker, Errors, Reports, or Landing Page */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="loading-card" style={{ maxWidth: '100%', margin: 0 }}>
              <div className="loader-animation"></div>
              <div className="loading-title">Conducting Investment Research...</div>
              <StatusTracker currentLog={currentLog} logs={logsList} />
            </div>
            
            {/* Pulsing Dashboard Skeleton Screens */}
            <div className="skeleton-container">
              <div className="skeleton-card hero-skeleton"></div>
              <div className="dashboard-grid">
                <div className="skeleton-card text-skeleton"></div>
                <div className="skeleton-card chart-skeleton"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="loading-card" style={{ borderLeft: '4px solid var(--color-pass)' }}>
            <div style={{ color: 'var(--color-pass)', fontWeight: '700', marginBottom: '8px' }}>⚠️ Analysis Failed</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{error}</p>
          </div>
        )}

        {!isLoading && !error && activeRun && (
          <Dashboard 
            run={activeRun}
            onSubmitFeedback={handleSubmitFeedback}
            feedbackMessage={feedbackMessage}
          />
        )}

        {!isLoading && !error && !activeRun && (
          <div className="landing-workflow">
            <h2 className="workflow-title">InsideInvest AI Agent Pipeline</h2>
            <p className="workflow-desc">
              Submit any public or private firm name. The agentic state graph resolves, scrapes, and analyzes 
              corporate data across three core pipeline phases:
            </p>
            <div className="workflow-grid">
              <div className="workflow-step-card">
                <div className="workflow-step-num">01</div>
                <h3>Ticker & Financials</h3>
                <p>
                  Identifies stock tickers via Yahoo Finance and pulls income statements, D/E ratios, gross/operating margins, 
                  FCF liquidity, and 1-year historical chart lines.
                </p>
              </div>
              <div className="workflow-step-card">
                <div className="workflow-step-num">02</div>
                <h3>Web Scraper due diligence</h3>
                <p>
                  Scrapes DuckDuckGo news results using cheerio to evaluate competitor strategies, market share growth, and 
                  potential headwinds or regulatory challenges.
                </p>
              </div>
              <div className="workflow-step-card">
                <div className="workflow-step-num">03</div>
                <h3>CIO Recommendation report</h3>
                <p>
                  Synthesizes quantitative metrics and sentiment checks via LLM JSON schemas, compiling a detailed Invest/Pass 
                  thesis with confidence gauges and risk tags.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
