# InsideInvest — AI Investment Research Agent

> **Live Demo:** https://ai-investment-research-agent-4hyxunviv.vercel.app
> **GitHub:** https://github.com/khushiyadav03/AI-Investment-Research-Agent

InsideInvest is a full-stack, AI-powered investment research platform. Enter any company name — public or private — and an agentic LangGraph.js pipeline resolves it, scrapes financial and news data from free public sources, runs multi-step LLM analysis, and delivers a structured **Invest / Pass** recommendation with a confidence score, risk rating, SWOT breakdown, and fully-referenced CIO thesis report.

---

## Overview

InsideInvest automates the workflow of a buy-side research analyst across seven pipeline stages:

1. **Company Resolution** — LLM identifies the canonical company from fuzzy or misspelled input, then cross-checks existence against Yahoo Finance and web search. Handles typos ("nvida" → NVIDIA), abbreviations, and private companies.
2. **Ticker Resolution** — Maps the verified company name to its exchange ticker symbol (e.g. "Apple" → AAPL). Skips gracefully for private companies.
3. **Financial Data Download** — Pulls balance sheet, income statement, key ratios (P/E, D/E, margins, FCF), and 1-year historical price chart from Yahoo Finance via the `yahoo-finance2` npm library. No paid API key required.
4. **Web Due Diligence** — Scrapes DuckDuckGo HTML search results using Cheerio for recent news, competitor activity, regulatory risks, and market drivers. Runs two parallel searches (growth signals + risk signals) and deduplicates.
5. **Fundamentals Analysis** — LLM evaluates the quantitative financial data: solvency, margins, leverage, valuation, and generates Strengths/Weaknesses lists with a metrics summary.
6. **Sentiment & Risk Assessment** — LLM evaluates qualitative signals from news: market opportunities, competitor headwinds, and overall news sentiment classification (Positive / Neutral / Negative).
7. **CIO Decision Synthesis** — LLM integrates all quantitative and qualitative signals to produce the final Invest/Pass decision with confidence %, risk rating (Low/Medium/High), and a full markdown reasoning report.

**Additional features built:**
- SQLite caching (7-day TTL) — instant reload for repeated queries
- Real-time progress streaming via Server-Sent Events (SSE)
- Multi-key Gemini API rotation with automatic failover across 5 keys and multiple model fallbacks
- Appwrite authentication (email/password signup/login)
- Appwrite database-backed Watchlist and Notifications
- Data visualisations: Financial Health Radar, Margin Breakdown bar chart, Growth Indicators, Sentiment Donut, Valuation vs Market benchmark chart, Liquidity & Balance Sheet panel
- Settings page with dark/light theme toggle
- Documentation and Feedback pages
- Audit feedback loop per research run

---

## How to Run

### Prerequisites
- **Node.js v22.5.0+** (required — uses native `node:sqlite` module)
- A **Gemini API key** (free at [Google AI Studio](https://aistudio.google.com/)) **or** an OpenAI API key

### 1. Backend Setup

```bash
cd backend
npm install
```

Create / edit `backend/.env`:

```env
PORT=3001
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=                        # optional
DEFAULT_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
```

> You can add multiple comma-separated Gemini keys for automatic rate-limit failover:
> `GEMINI_API_KEY=key1,key2,key3`

Start the backend:

```bash
npm run start
# Backend runs at http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (optional — only needed for Appwrite auth/watchlist/notifications):

```env
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
VITE_APPWRITE_WATCHLIST_COLLECTION_ID=watchlist
VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID=notifications
```

> Without these, the app works fully for research — auth/watchlist/notifications will use local seed data.

Start the frontend:

```bash
npm run dev
# Opens at http://localhost:5173
```

### 3. Use it

Open `http://localhost:5173`, type any company name (e.g. "Nvidia", "Tesla", "Stripe", "a local bakery"), and click **Research**. The pipeline runs live with real-time progress updates streaming to the UI.

---

## How It Works — Architecture

```
Browser (React + Vite)
    │
    │  POST /api/research  (SSE stream)
    │  GET  /api/history
    │  POST /api/history/:id/feedback
    ▼
Express.js Backend (Node.js)
    │
    ├── SQLite cache check (7-day TTL)
    │
    └── LangGraph.js StateGraph
            │
            ├── companyResolutionNode  ──► Gemini LLM (JSON schema)
            │       └── verifyCompany  ──► Yahoo Finance + DuckDuckGo
            │
            ├── tickerResolutionNode   ──► Yahoo Finance search
            │
            ├── fetchFinancialsNode    ──► yahoo-finance2
            │       └── fetchHistoricalChart
            │
            ├── webSearchNode          ──► DuckDuckGo HTML scraper (Cheerio)
            │
            ├── analyzeFundamentalsNode──► Gemini LLM (JSON schema)
            │
            ├── analyzeSentimentNode   ──► Gemini LLM (JSON schema)
            │
            └── synthesizeDecisionNode ──► Gemini LLM (JSON schema)
                        │
                        └── saveRun ──► SQLite (node:sqlite)
```

### SSE Streaming
Every node calls `sendProgress(config, message)` which writes a `data: {...}\n\n` SSE event. The React frontend opens a `fetch()` streaming reader, splits on `\n\n`, parses each event, and advances the 7-step progress stepper in real time.

### LLM JSON Control
All LLM calls use Gemini's `responseMimeType: 'application/json'` + `responseSchema` for structured output. This eliminates markdown wrapping and format hallucinations. A fallback JSON repair step handles trailing commas and illegal control characters.

### Multi-Key Failover
The `getLLMClients()` function splits `GEMINI_API_KEY` on commas, creates one client per key, and iterates key × model combinations until one succeeds. Daily quota exhaustion on one key triggers immediate failover to the next, with no delay.

### Routing Logic
After company resolution, the graph branches:
- `not_found` → stop, show suggestions
- `ambiguous` → stop, ask user to confirm which company
- `resolved` → continue full pipeline
- No financials at end → `limited_data` path (qualitative report only)

---

## Key Decisions & Trade-Offs

| Decision | Rationale |
|---|---|
| **LangGraph.js StateGraph** | Provides explicit node-by-node routing, conditional branching, and state accumulation — critical for a multi-step research workflow where any node can short-circuit the pipeline |
| **SSE over WebSockets** | SSE is unidirectional (server → client), which matches the use case perfectly and requires no socket library. Much simpler to implement and deploy on serverless (Vercel) |
| **Native `node:sqlite`** | Avoids C++ build-time compilation errors on Windows (common with `better-sqlite3`). Available natively in Node 22+ with no native addons |
| **Zero-key news scraper** | Custom DuckDuckGo HTML scraper with Cheerio avoids paid Google/Tavily API keys entirely while still providing fresh news data |
| **Gemini JSON schema mode** | Forces structured output without prompt engineering fragility. Much more reliable than asking the model to "output JSON" in the system prompt |
| **Canvas chart (custom)** | The stock price history chart is built from scratch with HTML5 Canvas — avoids large chart library import, gives full control over the orange gradient fill and crosshair tooltip style |
| **Recharts for analytics** | Radar, bar, donut charts for financial visualisations use recharts — avoids re-inventing complex math (polar coordinates, radial scales) for secondary charts |
| **Plain JS (not TypeScript)** | Reduces boilerplate for a time-bounded project. The codebase is small enough that type safety isn't the bottleneck |
| **Appwrite for auth/DB** | Free-tier managed BaaS — avoids writing auth logic from scratch while keeping the backend purely for the AI research pipeline |

**What was left out:**
- PDF/Excel export of the research report
- Real competitor comparison (fetching 2-3 peer tickers and comparing their ratios side by side)
- WebSocket-based real-time stock price updates
- User-level research history scoped to auth (currently SQLite is shared; Appwrite DB would scope it)
- Email notification on research completion (Appwrite Functions / Resend)

---

## Example Runs

### Run 1 — Apple Inc. (AAPL) · INVEST

| Metric | Value |
|---|---|
| Price | $275.15 USD |
| P/E Ratio | 33.35 |
| Debt-to-Equity | 79.5% |
| Operating Margin | 32.2% |
| Revenue Growth (YoY) | +16.6% |
| Free Cash Flow | $100B+ |

**Decision:** ↑ INVEST · **Confidence:** 85% · **Risk:** Low

**Summary:** Apple exhibits exceptional financial strength. Its operating margin of 32.2% is industry-leading, and YoY revenue growth of 16.6% highlights solid demand. Although its P/E ratio is premium at 33.35, its free cash flow (exceeding $100B) and return on equity (141.4%) justify the valuation. The risk is rated Low due to its massive services ecosystem locking in customers and an anticipated multi-year AI upgrade cycle.

---

### Run 2 — Tesla Inc. (TSLA) · PASS

| Metric | Value |
|---|---|
| Price | $185.00 USD |
| P/E Ratio | 55.20 |
| Debt-to-Equity | 12.5% |
| Profit Margin | 8.5% |
| Revenue Growth (YoY) | -2.1% |

**Decision:** ↓ PASS · **Confidence:** 75% · **Risk:** High

**Summary:** Tesla faces margin compression to 8.5% due to aggressive pricing competition. YoY growth has turned negative (-2.1%), indicating EV market saturation. At a P/E multiple of 55, the stock is priced for hyper-growth not currently supported by delivery numbers. Intense competition from domestic Chinese manufacturers and unresolved regulatory challenges around autonomous driving make this a Pass at current prices.

---

### Run 3 — Sweet Crust Bakery (Private) · PASS

| Metric | Value |
|---|---|
| Ticker | N/A (private) |
| Financial Data | Not available |

**Decision:** ↓ PASS · **Confidence:** 40% · **Risk:** High

**Summary:** Sweet Crust Bakery is a private local business with no public financial disclosures. Web sentiment is positive for local brand equity, but operating margins are pressured by ingredient inflation and labor costs. Complete information asymmetry prevents any investment decision under strict risk parameters. Pipeline correctly routes to the `limited_data` path.

---

### Run 4 — Stripe Inc. (Private Fintech) · LIMITED DATA

Stripe is a well-known private company — the pipeline correctly identifies it as private, skips ticker/financials, and produces a qualitative research summary covering its $65B valuation, payment processing market share, and competitive headwinds from Block and PayPal.

---

## What I Would Improve With More Time

1. **Competitor benchmarking** — Fetch 2-3 peer company tickers automatically from the LLM's knowledge and pull their key ratios to build a true grouped bar chart comparison (company vs peers vs sector average)
2. **PDF export** — Generate a one-click downloadable PDF of the full CIO report with all charts embedded, using Puppeteer or a React-to-PDF library
3. **Multi-model consensus** — Run the synthesis node through both Gemini and GPT-4o in parallel and highlight where they disagree, giving the user a second opinion on the final recommendation
4. **Per-user research history** — Scope the SQLite/Appwrite runs to the authenticated user's ID so each user sees only their own history
5. **Real-time price widget** — WebSocket-based live price ticker on the dashboard for publicly traded companies
6. **Email alerts** — Appwrite Functions + Resend integration to email the report when a watched company is re-researched and the decision changes

---

## LLM Chat Logs & Development Transcripts

All internal agent thought logs — step-by-step execution traces showing ticker lookups, scraping fetches, LLM prompts, JSON outputs, and parsing steps for real research runs — are documented in **`thought_logs.md`** in the root folder.

The development process used **Kiro AI** (Amazon's agentic IDE) as the primary AI pair-programmer for code generation, debugging, architecture decisions, and iterative refinement throughout the build. All significant design choices — including the LangGraph routing logic, SSE streaming architecture, multi-key failover system, and the Appwrite integration — were reasoned through and implemented collaboratively with the AI assistant, with every generated piece of code reviewed and validated by the developer.
