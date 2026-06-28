import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import HistorySidebar from './components/HistorySidebar';
import StatusTracker from './components/StatusTracker';
import Dashboard from './components/Dashboard';
import CompanyNotFound from './components/CompanyNotFound';
import CompanyAmbiguous from './components/CompanyAmbiguous';
import LimitedDataReport from './components/LimitedDataReport';
import NotificationsDropdown from './components/NotificationsDropdown';
import WatchlistPage from './pages/WatchlistPage';
import SettingsPage from './pages/SettingsPage';
import DocumentationPage from './pages/DocumentationPage';
import FeedbackPage from './pages/FeedbackPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Icon from './components/Icon';
import { useWatchlist } from './hooks/useWatchlist';
import { useNotifications } from './hooks/useNotifications';

const getSavedCollapsed = () => {
  try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
  catch { return false; }
};

export default function App() {
  const { currentUser, loading: authLoading, logout } = useAuth();

  // ── Page / UI state ─────────────────────────────────────────
  const [activePage, setActivePage]         = useState('research');
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getSavedCollapsed);
  const [theme, setTheme]                   = useState('light');
  const [notifOpen, setNotifOpen]           = useState(false);
  const [msgOpen, setMsgOpen]               = useState(false);

  // ── Research state ───────────────────────────────────────────
  const [searchTerm, setSearchTerm]         = useState('');
  const [bypassCache, setBypassCache]       = useState(false);
  const [activeRun, setActiveRun]           = useState(null);
  const [runsHistory, setRunsHistory]       = useState([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [currentLog, setCurrentLog]         = useState('');
  const [logsList, setLogsList]             = useState([]);
  const [error, setError]                   = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const heroInputRef = useRef(null);

  const userId   = currentUser?.$id ?? null;
  const watchlist = useWatchlist(userId);
  const notifs    = useNotifications(userId);

  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/_./backend/api';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

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

  const handleNavigate = (page) => {
    // Guard protected pages — redirect to login if not authenticated
    if ((page === 'watchlist' || page === 'settings') && !currentUser) {
      setActivePage('login');
      return;
    }
    setActivePage(page);
  };

  const handleSearchSubmit = async (e, overrideTerm = null) => {
    if (e?.preventDefault) e.preventDefault();
    const term = (overrideTerm || searchTerm).trim();
    if (!term) return;
    if (overrideTerm) setSearchTerm(overrideTerm);

    setActivePage('research');
    setIsLoading(true); setError(''); setActiveRun(null);
    setCurrentLog('Starting connection...'); setLogsList(['Starting connection...']); setFeedbackMessage('');

    try {
      const response = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: term, bypassCache: overrideTerm ? true : bypassCache }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Server error ${response.status}${errText ? ': ' + errText.slice(0, 120) : ''}`);
      }

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
              notifs.pushResearchComplete(payload.result.companyName, payload.result.decision);
            } else if (payload.type === 'error') {
              setError(payload.message); setIsLoading(false);
            }
          } catch (jsonErr) { console.error('Stream parse error:', jsonErr); }
        }
      }
    } catch (err) {
      console.error('[App] Research error:', err);
      setError(err.message || 'Network error — verify backend is running on port 3001.');
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

  const handleNewSearch = () => {
    setActiveRun(null); setSearchTerm(''); setError(''); setFeedbackMessage('');
    setActivePage('research');
    setTimeout(() => heroInputRef.current?.focus(), 80);
  };

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
      if (res.ok) { setFeedbackMessage('Audit feedback saved!'); fetchHistory(); }
      else { const e = await res.json(); throw new Error(e.error || 'Failed to update feedback.'); }
    } catch (err) { setError(`Feedback error: ${err.message}`); }
  };

  const handleSuggestionSelect = (companyName) => handleSearchSubmit(null, companyName);

  const handleWatchlistResearch = (companyName) => {
    setActivePage('research');
    handleSearchSubmit(null, companyName);
  };

  // ── Auth loading splash ──────────────────────────────────────
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="loader-spinner" />
        <p>Loading InsideInvest…</p>
      </div>
    );
  }

  // ── Auth pages (full-screen, no shell) ───────────────────────
  if (activePage === 'login')  return <LoginPage  onNavigate={setActivePage} />;
  if (activePage === 'signup') return <SignupPage onNavigate={setActivePage} />;

  // ── Render page content ──────────────────────────────────────
  const renderResearchContent = () => {
    if (isLoading) {
      return (
        <div className="loading-wrap">
          <div className="loading-card">
            <div className="loader-spinner" />
            <div className="loading-card-title">Conducting Investment Research…</div>
            <StatusTracker currentLog={currentLog} logs={logsList} />
          </div>
          <div className="skeleton-grid">
            <div className="skeleton-block sk-panel-a" />
            <div className="content-stack">
              <div className="skeleton-block sk-hero" />
              <div className="skeleton-block sk-panel-b" />
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
      if (status === 'not_found')    return <CompanyNotFound   run={activeRun} onSelectSuggestion={handleSuggestionSelect} />;
      if (status === 'ambiguous')    return <CompanyAmbiguous  run={activeRun} onSelectSuggestion={handleSuggestionSelect} />;
      if (status === 'limited_data') return <LimitedDataReport run={activeRun} />;
      return <Dashboard run={activeRun} onSubmitFeedback={handleSubmitFeedback} feedbackMessage={feedbackMessage} watchlist={watchlist} />;
    }
    return (
      <div>
        <div className="hero-search-section">
          <div className="landing-hero-badge">
            <Icon name="activity" size={12} color="var(--color-brand)" /> AI-Powered · Free Data Sources
          </div>
          <h1 className="landing-hero-title">Research any company<br /><span>in seconds</span></h1>
          <p className="landing-hero-sub">
            Enter any public or private company name. The AI agent resolves, scrapes, and analyzes corporate data to produce an Invest or Pass recommendation.
          </p>
          <form className="hero-search-form" onSubmit={handleSearchSubmit}>
            <div className="hero-search-wrap">
              <Icon name="search" size={18} color="var(--text-muted)" />
              <input ref={heroInputRef} className="hero-search-input" placeholder="Enter company name (e.g. Nvidia, Tesla, Stripe…)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={isLoading} autoFocus />
              <button className="hero-search-btn" type="submit" disabled={isLoading || !searchTerm.trim()}>
                {isLoading ? 'Analyzing…' : 'Research'}
              </button>
            </div>
            <div className="hero-search-options">
              <label className="bypass-cache-label">
                <input type="checkbox" checked={bypassCache} onChange={e => setBypassCache(e.target.checked)} />
                <span>Force fresh analysis (bypass cache)</span>
              </label>
            </div>
          </form>
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
            <p className="landing-step-desc">Synthesizes quantitative metrics and sentiment via LLM JSON schemas to produce a detailed Invest/Pass thesis.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    if (activePage === 'watchlist')     return <WatchlistPage     watchlist={watchlist} onResearch={handleWatchlistResearch} />;
    if (activePage === 'settings')      return <SettingsPage      theme={theme} onToggleTheme={toggleTheme} />;
    if (activePage === 'documentation') return <DocumentationPage />;
    if (activePage === 'feedback')      return <FeedbackPage />;
    return renderResearchContent();
  };

  const PAGE_TITLES = {
    watchlist:     'Watchlist',
    settings:      'Settings',
    documentation: 'Documentation',
    feedback:      'Feedback',
  };
  const pageTitle = PAGE_TITLES[activePage] || (activeRun ? (activeRun.companyName || 'Research Report') : 'Research');

  // Navbar avatar initials from real user
  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AI';
  const userName  = currentUser?.name  || 'Analyst';
  const userEmail = currentUser?.email || 'CIO Mode';

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-closed'}`} data-theme={theme}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <HistorySidebar
        runs={runsHistory}
        activeRunId={activeRun?.id ?? null}
        onSelectRun={handleSelectRun}
        onNewSearch={handleNewSearch}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        activePage={activePage}
        onNavigate={handleNavigate}
      />

      <div className="main-panel">
        <nav className="top-navbar">
          <button className="navbar-hamburger" onClick={() => setSidebarOpen(s => !s)}>
            <Icon name="menu" size={20} />
          </button>

          {activePage === 'research' && activeRun ? (
            <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
              <div className="navbar-search-wrap">
                <Icon name="search" size={14} color="var(--text-muted)" />
                <input className="navbar-search-input" placeholder="Search another company…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={isLoading} />
                <button className="navbar-search-btn" type="submit" disabled={isLoading || !searchTerm.trim()}>{isLoading ? '…' : 'Go'}</button>
              </div>
            </form>
          ) : (
            <div style={{ flex: 1, fontFamily: activePage !== 'research' ? 'var(--font-title)' : undefined, fontWeight: activePage !== 'research' ? 700 : undefined, fontSize: '0.95rem', color: 'var(--text-primary)', paddingLeft: 4 }}>
              {activePage === 'research' ? 'InsideInvest — AI Research Agent' : pageTitle}
            </div>
          )}

          <div className="navbar-right">
            <label className="bypass-cache-label" title="Force fresh analysis">
              <input type="checkbox" checked={bypassCache} onChange={e => setBypassCache(e.target.checked)} />
              <span>Fresh</span>
            </label>

            <div className="navbar-divider" />

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button className="navbar-icon-btn" title="Notifications" onClick={() => { setNotifOpen(o => !o); setMsgOpen(false); }}>
                <Icon name="alert" size={17} />
                {notifs.unreadNotifications > 0 && <span className="navbar-badge">{notifs.unreadNotifications}</span>}
              </button>
              {notifOpen && (
                <NotificationsDropdown type="notification" items={notifs.notifications} unread={notifs.unreadNotifications}
                  onMarkRead={notifs.markNotificationRead} onMarkAllRead={notifs.markAllNotificationsRead} onClose={() => setNotifOpen(false)} />
              )}
            </div>

            {/* Messages */}
            <div style={{ position: 'relative' }}>
              <button className="navbar-icon-btn" title="Messages" onClick={() => { setMsgOpen(o => !o); setNotifOpen(false); }}>
                <Icon name="message" size={17} />
                {notifs.unreadMessages > 0 && <span className="navbar-badge">{notifs.unreadMessages}</span>}
              </button>
              {msgOpen && (
                <NotificationsDropdown type="message" items={notifs.messages} unread={notifs.unreadMessages}
                  onMarkRead={notifs.markMessageRead} onMarkAllRead={notifs.markAllMessagesRead} onClose={() => setMsgOpen(false)} />
              )}
            </div>

            <div className="navbar-divider" />

            {/* User avatar — real name from Appwrite */}
            {currentUser ? (
              <div className="navbar-user" onClick={() => handleNavigate('settings')}>
                <div className="navbar-avatar">{userInitials}</div>
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{userName}</span>
                  <span className="navbar-user-role">{userEmail}</span>
                </div>
              </div>
            ) : (
              <button className="btn-brand" style={{ padding: '7px 18px', fontSize: '0.82rem', borderRadius: 50 }} onClick={() => setActivePage('login')}>
                Sign in
              </button>
            )}
          </div>
        </nav>

        <main className="page-content">
          {activePage === 'research' && activeRun && (
            <div>
              <h1 className="page-heading">{pageTitle}</h1>
              <p className="page-subheading">
                {`AI Analysis · ${activeRun.ticker ? activeRun.ticker + ' · ' : ''}${activeRun.createdAt ? new Date(activeRun.createdAt).toLocaleDateString() : ''}`}
              </p>
            </div>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
