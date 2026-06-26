import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './db/database.js';
import { agentGraph } from './agent/agentGraph.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

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
  res.flushHeaders(); // Establish stream immediately

  // Helper function to send SSE events
  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

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
      ticker: finalState.ticker,
      decision: finalState.decision,
      confidence: finalState.confidence,
      riskRating: finalState.riskRating,
      reasoning: finalState.reasoning,
      financialSummary: finalState.financialSummary,
      searchResults: finalState.searchResults,
      thoughtLogs: finalState.thoughtLogs
    });

    // Fetch the newly saved complete row
    const completeRun = database.getRunById(newRunId);

    console.log(`[Server] Saved run to DB with ID: ${newRunId}`);
    sendEvent('result', { result: completeRun, cached: false });
    res.end();
  } catch (error) {
    console.error(`[Server] Error processing research for "${company}":`, error);
    sendEvent('error', { message: `Research analysis failed: ${error.message}` });
    res.end();
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
