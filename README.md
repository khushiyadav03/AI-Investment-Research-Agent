# InsideInvest: AI Investment Research Agent

**Live Demo:** https://ai-investment-research-agent-nine.vercel.app

**GitHub:** https://github.com/khushiyadav03/AI-Investment-Research-Agent

InsideInvest is a full-stack AI investment research application. It takes a company name (public or private), conducts automated financial and sentiment research using free public sources, orchestrates analysis using an agentic state graph (LangGraph.js), and outputs a structured "Invest" or "Pass" recommendation with a confidence score, risk rating, and detailed reasoning.

---

## Overview

InsideInvest automates the workflow of an investment research analyst across six stages:

1. **Ticker Resolution** — Determines if the company is publicly traded and maps its name to a stock market ticker (e.g. "Apple" → AAPL). Gracefully proceeds as a private company if no ticker is found.
2. **Financial Data Download** — Downloads balance sheet summaries, income statements, margins, valuation multiples, and historical price charts via Yahoo Finance — no paid API key required.
3. **Web Search Scraping** — Scrapes DuckDuckGo search results (via Cheerio) for recent news headlines, competitive landscape, and risk vectors.
4. **Agentic Analysis**
   - *Fundamentals* — evaluates solvency, leverage, cash flows, and profit margins.
   - *Sentiment* — analyzes market sentiment, competitor pressures, and industry headwinds.
   - *Synthesizer* — integrates financial stats and qualitative news to formulate the final CIO investment report.
5. **SQLite Database Cache** — Saves all research runs to a persistent SQLite database so reports can be reloaded instantly.
6. **Audit & Feedback Loop** — Lets users submit rating feedback (Agree/Helpful or Disagree/Audit) and comments on each run.

---

## How to Run

### Prerequisites
- Node.js v22.5.0+ (required — uses native `node:sqlite` module)
- A Gemini API key (free at Google AI Studio) or an OpenAI API key

### Backend Setup
```
cd backend
npm install
```

Create `backend/.env`:
```
PORT=3001
GEMINI_API_KEY=your_actual_gemini_key_here
OPENAI_API_KEY=your_optional_openai_key_here
DEFAULT_PROVIDER=gemini
```

Start the backend:
```
npm run start
# Runs at http://localhost:3001 and auto-initializes database.sqlite
```

### Frontend Setup
```
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173 (Vite dev server)
```

### Use It
Open the local dev link (or the live demo), type any company name (e.g. "Apple", "Tesla", "a local bakery"), and run the research. Progress streams live to the UI via Server-Sent Events.

---

## How It Works — Architecture

InsideInvest connects a React frontend with an Express.js (Node.js) backend running an agentic LangGraph.js StateGraph.

```
React Frontend (Vite)
    │
    │  EventSource stream — real-time progress logs
    ▼
Express.js Backend (Node.js)
    │
    ├── SQLite cache check
    │
    └── LangGraph.js StateGraph
            │
            ├── tickerResolution     ──► Yahoo Finance search
            ├── fetchFinancials      ──► yahoo-finance2 (stats + 1yr chart)
            ├── webSearch            ──► DuckDuckGo HTML scraper (Cheerio)
            ├── analyzeFundamentals  ──► Gemini LLM (JSON mode)
            ├── analyzeSentiment     ──► Gemini LLM (JSON mode)
            └── synthesizeDecision   ──► Gemini LLM (JSON mode)
                        │
                        └── saveRun ──► SQLite (node:sqlite)
```

- **React Frontend** collects the search term, opens an `EventSource` connection to stream real-time logs, and renders the dashboard, canvas stock charts, and SWOT grids.
- **Express Backend** checks the SQLite cache first; on a cache miss it runs the LangGraph workflow, streaming progress via SSE.
- **Scrapers** interface with Yahoo Finance (`yahoo-finance2`) and a custom DuckDuckGo + Cheerio scraper for news.
- **LLM calls** use Gemini in JSON mode for structured, schema-validated output at each analysis node.

---

## Key Decisions & Trade-Offs

| Decision | Rationale |
|---|---|
| Plain JavaScript (JSX), not TypeScript | Reduces boilerplate for a time-bounded project; keeps the codebase easy to inspect and modify |
| SSE over REST/WebSockets | Unidirectional server→client fits this use case exactly; shows live progress steps instead of a static spinner, with no socket library needed |
| Zero-key news scraper (DuckDuckGo + Cheerio) | Avoids paid Google Search/Tavily API keys while still providing fresh news data |
| Native `node:sqlite` | Avoids C++ build-time compilation errors common with `better-sqlite3`, especially on Windows; available natively in Node 22+ |
| Custom Canvas stock chart | Built from scratch with HTML5 Canvas to avoid a heavy chart library import and to allow custom gradient fill + crosshair tooltip styling |
| Gemini JSON schema mode for LLM calls | Forces structured output without fragile prompt engineering |
| No user accounts/authentication | Left out to keep installation simple and keep scope focused strictly on the AI research pipeline |

**What was left out:**
- PDF/Excel export of the research report
- Real competitor benchmarking (peer ticker comparison)
- WebSocket-based real-time stock price updates
- Multi-model consensus (Gemini vs GPT-4o cross-check)

---

## Example Runs

### Run 1 — Apple Inc. (AAPL) · INVEST
| Metric | Value |
|---|---|
| Price | $275.15 |
| P/E Ratio | 33.35 |
| Debt-to-Equity | 79.5% |
| Operating Margin | 32.2% |
| Revenue Growth (YoY) | +16.6% |

**Decision:** ↑ INVEST · **Confidence:** 85% · **Risk:** Low

Apple shows industry-leading 32.2% operating margins and 16.6% YoY revenue growth. The premium P/E (33.35) is justified by free cash flow exceeding $100B and a 141.4% return on equity. Risk is rated Low given the services ecosystem's customer lock-in.

### Run 2 — Tesla Inc. (TSLA) · PASS
| Metric | Value |
|---|---|
| Price | $185.00 |
| P/E Ratio | 55.20 |
| Debt-to-Equity | 12.5% |
| Profit Margin | 8.5% |
| Revenue Growth (YoY) | -2.1% |

**Decision:** ↓ PASS · **Confidence:** 75% · **Risk:** High

Tesla's margins have compressed to 8.5% amid pricing competition, and YoY growth has turned negative (-2.1%), signaling EV market saturation. A P/E of 55 prices in hyper-growth not currently supported by delivery numbers; competition from domestic Chinese manufacturers and unresolved autonomous-driving regulation add risk.

### Run 3 — Sweet Crust Bakery (Private) · PASS
| Metric | Value |
|---|---|
| Ticker | N/A (private) |
| Financial Data | Not available |

**Decision:** ↓ PASS · **Confidence:** 40% · **Risk:** High

As a private local business, no verified financial statements are available. Web sentiment is positive for local brand equity, but margins face pressure from ingredient inflation and labor costs. Lack of disclosure creates information asymmetry, resulting in a Pass under strict risk parameters.

---

## What I Would Improve With More Time

- **Competitor benchmarking** — fetch 2–3 peer tickers and compare key ratios (company vs. peers vs. sector average)
- **PDF/Excel export** — one-click downloadable report with charts embedded
- **Multi-model consensus** — run synthesis through both Gemini and GPT-4o in parallel and flag disagreements
- **WebSockets for stock feeds** — real-time price ticker instead of static data
- **User accounts** — scope research history per authenticated user

---

## LLM Usage & Development Process

This project was built with AI assistance throughout — for code generation, debugging, and architecture decisions (LangGraph routing logic, SSE streaming design, and node structuring). Every generated piece of code was reviewed and validated manually.

Step-by-step **agent execution and reasoning logs** — showing ticker lookups, scraping fetches, LLM prompts/outputs, and parsing steps for real research runs — are documented in `thought_logs.md` in the root folder.