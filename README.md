# InsideInvest: AI Investment Research Agent

InsideInvest is a full-stack AI investment research application. It takes a company name (public or private), conducts automated financial and sentiment research using free public sources, orchestrates analysis using an agentic state graph (LangGraph.js), and outputs a structured "Invest" or "Pass" recommendation with a confidence score, risk rating, and detailed reasoning.

---

## Overview

InsideInvest automates the complex workflow of an investment research analyst:
1. Ticker Resolution: Determines if the company is publicly traded and maps its name to a stock market ticker (for example, "Apple" to AAPL).
2. Financial Data Download: Downloads balance sheet summaries, income statements, margins, valuation multiples, and historical price charts without requiring paid API keys.
3. Web Search Scraping: Scrapes DuckDuckGo search results for recent news headlines, competitive landscape, and risk vectors.
4. Agentic Analysis:
   - Fundamentals: Evaluates solvency, leverage, cash flows, and profit margins.
   - Sentiment: Analyzes market sentiment, competitor pressures, and industry headwind risks.
   - Synthesizer: Integrates financial stats and qualitative news to formulate the final CIO investment report.
5. SQLite Database Cache: Saves all research runs to a persistent SQLite database so reports can be reloaded instantly.
6. Audit & Feedback Loop: Allows users to submit rating feedback (Agree/Helpful or Disagree/Audit) and comments on each run.

---

## Setup and Run Instructions

### Prerequisites
- Node.js (version 22.5.0 or higher is required, as the application uses native Node.js SQLite features).
- A Gemini API key (recommended, get one at Google AI Studio) or an OpenAI API key.

### Configuration
1. Open the backend configuration file: `backend/.env`
2. Add your Gemini or OpenAI API keys:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_actual_gemini_key_here
   OPENAI_API_KEY=your_optional_openai_key_here
   DEFAULT_PROVIDER=gemini
   ```

### Running the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm run start
   ```
   The backend will start on port 3001 and automatically verify/initialize the database file `database.sqlite` in the backend root directory.

### Running the Frontend
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open the development link displayed in the terminal in your web browser (usually http://localhost:5173).

---

## How It Works: Approach and Architecture

InsideInvest connects a modern React client with an Express Node.js backend running an agentic StateGraph.

### Architecture Data Flow
- React Frontend: Collects the user's company search term, opens an EventSource connection to stream real-time logs, and renders the interactive dashboard, canvas stock charts, and SWOT grids.
- Express Backend: Coordinates cache lookups in SQLite before running the AI graph. If it is a cache miss, it executes the LangGraph workflow, streaming progress updates in real-time using Server-Sent Events (SSE).
- SQLite Database: Leverages native Node.js SQLite to store and fetch research runs.
- Scrapers: Interface with Yahoo Finance (via yahoo-finance2 npm library) and DuckDuckGo (custom search scraper parsing HTML with cheerio).

### LangGraph.js State Graph Nodes
1. `tickerResolution`: Resolves the stock ticker symbol.
2. `fetchFinancials`: Fetches key statistics and 1-year historical chart coordinates.
3. `webSearch`: Conducts search scraping for news headlines and competitor activities.
4. `analyzeFundamentals`: Generates financial strength/weakness lists and summarizes balance sheet health.
5. `analyzeSentiment`: Focuses on news sentiment, market opportunities, and competitive headwinds.
6. `synthesizeDecision`: Formulates the final investment decision (Invest or Pass), confidence percentage, risk rating, and thesis reasoning.

---

## Key Decisions and Trade-Offs

- React with Plain JavaScript (JSX): Selected plain JavaScript instead of TypeScript to maximize accessibility and make the codebase straightforward to inspect and modify.
- Server-Sent Events (SSE) for Progress: Used SSE streams instead of standard REST requests. This allows the frontend to show real-time progress steps (such as "Downloading financial statements", "Analyzing balance sheet") while the AI agent runs, rather than showing a static spinner for 15 seconds.
- Zero-Key News Scraper: Built a custom scraper that queries DuckDuckGo and parses HTML using Cheerio, meaning the application does not require paid Google Search or Tavily API keys to perform web due diligence.
- Native Node.js SQLite: Used Node's native `node:sqlite` module instead of libraries like `sqlite3` or `better-sqlite3`. This avoids build-time C++ compilation errors on Windows and ensures smooth installation.
- Custom Canvas Chart: Built a custom price history chart from scratch using HTML5 Canvas. This avoided adding large chart libraries, reduced bundle size, and allowed custom glowing area gradients and crosshair tooltips.
- What Was Left Out: Did not implement user accounts or authentication to keep the installation simple and focused strictly on the AI agent workflow.

---

## Example Runs

### Example Run 1: Apple Inc (AAPL)
- Input: Apple Inc.
- Ticker: AAPL
- Metrics: Price: $275.15 | Valuation (P/E): 33.35 | Debt-to-Equity: 79.5% | Operating Margin: 32.2% | Revenue Growth (YoY): 16.6%
- Decision: INVEST
- Confidence: 85%
- Risk Rating: Low
- Summary: Apple exhibits exceptional financial strength. Its operating margin of 32.2% is industry-leading, and YoY revenue growth of 16.6% highlights solid demand. Although its P/E ratio is premium at 33.35, its free cash flow (exceeding $100B) and return on equity (141.4%) justify the valuation. The risk is rated Low due to its massive services ecosystem locking in customers.

### Example Run 2: Tesla Inc (TSLA)
- Input: Tesla Inc.
- Ticker: TSLA
- Metrics: Price: $185.00 | Valuation (P/E): 55.20 | Debt-to-Equity: 12.5% | Profit Margin: 8.5% | Revenue Growth (YoY): -2.1%
- Decision: PASS
- Confidence: 75%
- Risk Rating: High
- Summary: Tesla faces margins compression down to 8.5% due to pricing competition. YoY growth has slowed to -2.1%, showing EV market saturation. At a P/E multiple of 55, the stock is priced for hyper-growth which is not currently supported by deliveries. High competition from domestic manufacturers and regulatory autonomous driving challenges make it a Pass at current prices.

### Example Run 3: Sweet Crust Bakery (Private Business)
- Input: Sweet Crust Bakery
- Ticker: N/A
- Metrics: N/A (No public stock disclosures available)
- Decision: PASS
- Confidence: 40%
- Risk Rating: High
- Summary: Because Sweet Crust Bakery is a private local business, no verified balance sheets or cash flows are publicly available. Web sentiment is positive regarding local brand equity, but local bakery operations face margin pressure from raw ingredient inflation and labor costs. The lack of financial disclosures creates information asymmetry, resulting in a Pass under strict risk parameters.

---

## Future Improvements

With more time, the following features would be added:
1. PDF and Excel Export: Allow downloading the complete SWOT analysis, financial tables, and CIO reasoning report as a PDF.
2. Multi-Model Consensus: Run the final synthesis node through both Gemini and OpenAI in parallel, highlighting any differences in their investment recommendations.
3. WebSockets for Stock Feeds: Stream real-time stock price changes on the dashboard using WebSockets instead of static polling.

---

## LLM Chat logs and Transcripts
As part of the development process, all LLM communication logs and internal agent reasoning steps are documented inside the file `thought_logs.md` in the root folder. This file contains step-by-step logs of ticker lookups, scraping fetches, LLM inputs, and parsing steps.
