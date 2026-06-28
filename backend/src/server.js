import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './db/database.js';
import { agentGraph } from './agent/agentGraph.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: true,          // reflect the request origin (safe for local dev)
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));
app.use(express.json());

// Catch unhandled promise rejections — prevents process crash that causes ERR_CONNECTION_RESET
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

/**
 * Endpoint: POST /api/research
 * Starts the research graph and streams progress updates using Server-Sent Events (SSE)
 */
app.post('/api/research', async (req, res) => {
  const { companyName, bypassCache } = req.body;

  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    return res.status(400).json({ error: "Company name is required." });
  }

  const company = companyName.trim();
  console.log(`[Server] Initiating research request for company: "${company}"`);

  // Set headers for Server-Sent Events (SSE) streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Allow cross-origin reads of SSE stream
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.flushHeaders();

  // Helper to send SSE events — safe against write-after-close
  const sendEvent = (type, data) => {
    if (res.writableEnded) return;
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch (e) {
      console.warn('[Server] SSE write error (client likely disconnected):', e.message);
    }
  };

  // Close SSE cleanly if client disconnects early
  req.on('close', () => {
    if (!res.writableEnded) {
      console.log(`[Server] Client disconnected during research for "${company}"`);
      res.end();
    }
  });

  // Hard timeout — 4 min max for any research run
  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      console.warn(`[Server] Research timeout for "${company}" after 4 minutes`);
      sendEvent('error', { message: 'Research timed out after 4 minutes. The AI pipeline took too long — please try again.' });
      res.end();
    }
  }, 240000);

  try {
    // 1. Check SQLite cache (unless bypassed)
    if (!bypassCache) {
      sendEvent('log', { message: "Checking history database for cached research..." });
      // Search Cache (default 7 days limit)
      const cachedRun = database.getRecentRunByCompany(company);
      if (cachedRun) {
        console.log(`[Server] Found recent cached research for "${company}" (ID: ${cachedRun.id})`);
        sendEvent('log', { message: "Found recent research in database. Loading cached report..." });
        
        // Brief pause to simulate loading for smooth UX
        await new Promise(r => setTimeout(r, 800));
        
        sendEvent('result', { result: cachedRun, cached: true });
        clearTimeout(timeout);
        return res.end();
      }
    }

    // 2. Validate API key config before invoking AI graph
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!geminiKey && !openaiKey) {
      sendEvent('error', { 
        message: "LLM API Key missing! Please configure GEMINI_API_KEY or OPENAI_API_KEY in the backend/.env file." 
      });
      clearTimeout(timeout);
      return res.end();
    }

    // 3. Execute LangGraph research agent
    sendEvent('log', { message: "Initializing investment research agent graph..." });

    const finalState = await agentGraph.run(company, (progressLog) => {
      // Stream each node's progress report back to the client
      sendEvent('log', { message: progressLog });
    });

    // 4. Save results to SQL database
    sendEvent('log', { message: "Saving research results to database..." });
    const newRunId = database.saveRun({
      companyName: finalState.companyName,
      originalUserInput: finalState.originalUserInput || company,
      ticker: finalState.ticker,
      decision: finalState.decision,
      confidence: finalState.confidence,
      riskRating: finalState.riskRating,
      reasoning: finalState.reasoning,
      financialSummary: finalState.financialSummary,
      chartData: finalState.chartData,
      searchResults: finalState.searchResults,
      thoughtLogs: finalState.thoughtLogs,
      fundamentalAnalysis: finalState.fundamentalAnalysis,
      sentimentAnalysis: finalState.sentimentAnalysis,
      resolutionStatus: finalState.resolutionStatus || 'resolved',
      resolvedCompany: finalState.resolvedCompany,
      companyResolution: finalState.companyResolution
    });

    // Fetch the newly saved complete row
    const completeRun = database.getRunById(newRunId);

    console.log(`[Server] Saved run to DB with ID: ${newRunId}`);
    sendEvent('result', { result: completeRun, cached: false });
    clearTimeout(timeout);
    res.end();
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[Server] Error processing research for "${company}":`, error?.stack || error);
    sendEvent('error', { message: `Research analysis failed: ${error?.message || 'Unknown error'}` });
    if (!res.writableEnded) res.end();
  }
});

/**
 * Endpoint: GET /api/history
 * Fetches all past research runs (summarized)
 */
app.get('/api/history', (req, res) => {
  try {
    const history = database.getAllRuns();
    res.json(history);
  } catch (error) {
    console.error("[Server] Error getting history:", error);
    res.status(500).json({ error: "Failed to load research history." });
  }
});

/**
 * Endpoint: GET /api/history/:id
 * Fetches complete details of a specific past research run
 */
app.get('/api/history/:id', (req, res) => {
  const { id } = req.params;
  try {
    const run = database.getRunById(parseInt(id));
    if (!run) {
      return res.status(404).json({ error: "Research run not found." });
    }
    res.json(run);
  } catch (error) {
    console.error(`[Server] Error getting run by ID (${id}):`, error);
    res.status(500).json({ error: "Failed to load research report details." });
  }
});

/**
 * Endpoint: POST /api/history/:id/feedback
 * Saves user ratings/comments on a specific recommendation
 */
app.post('/api/history/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  if (!status || !['helpful', 'unhelpful', 'none'].includes(status)) {
    return res.status(400).json({ error: "Invalid feedback status. Must be 'helpful' or 'unhelpful'." });
  }

  try {
    const success = database.saveFeedback(parseInt(id), status, comment || '');
    if (!success) {
      return res.status(404).json({ error: "Research run not found." });
    }
    res.json({ success: true, message: "Feedback saved successfully." });
  } catch (error) {
    console.error(`[Server] Error saving feedback for ID (${id}):`, error);
    res.status(500).json({ error: "Failed to save feedback." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Investment Research Backend running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`==================================================`);
});

export default app;
