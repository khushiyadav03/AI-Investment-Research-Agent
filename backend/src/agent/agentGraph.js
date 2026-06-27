import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { financeService } from '../services/financeService.js';
import { searchService } from '../services/searchService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Schemas for Controlled JSON Generation (Gemini responseSchema)
const fundamentalAnalysisSchema = {
  type: "object",
  properties: {
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "List of financial strengths"
    },
    weaknesses: {
      type: "array",
      items: { type: "string" },
      description: "List of financial weaknesses"
    },
    metricsSummary: {
      type: "string",
      description: "2-3 sentences summarizing the financial health (solvency, margins, liquidity, valuation)"
    }
  },
  required: ["strengths", "weaknesses", "metricsSummary"]
};

const sentimentAnalysisSchema = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      items: { type: "string" },
      description: "List of market opportunities/drivers"
    },
    threats: {
      type: "array",
      items: { type: "string" },
      description: "List of risks/threats/competitors"
    },
    sentiment: {
      type: "string",
      enum: ["Positive", "Negative", "Neutral"],
      description: "Overall sentiment classification"
    },
    marketSentimentSummary: {
      type: "string",
      description: "2-3 sentences summarizing current sentiment and risk profile"
    }
  },
  required: ["opportunities", "threats", "sentiment", "marketSentimentSummary"]
};

const synthesisDecisionSchema = {
  type: "object",
  properties: {
    decision: {
      type: "string",
      enum: ["Invest", "Pass"],
      description: "Final investment decision"
    },
    confidence: {
      type: "integer",
      description: "Confidence score between 0 and 100"
    },
    riskRating: {
      type: "string",
      enum: ["Low", "Medium", "High"],
      description: "Overall risk rating"
    },
    reasoning: {
      type: "string",
      description: "A detailed, professional markdown report explaining the decision, citing specific financial stats and sentiment trends."
    }
  },
  required: ["decision", "confidence", "riskRating", "reasoning"]
};

// Define the State schema using LangGraph's Annotation
const StateAnnotation = Annotation.Root({
  companyName: Annotation(),
  ticker: Annotation(),
  financialSummary: Annotation(),
  chartData: Annotation(),
  searchResults: Annotation(),
  fundamentalAnalysis: Annotation(),
  sentimentAnalysis: Annotation(),
  
  // Final outputs
  decision: Annotation(),
  confidence: Annotation(),
  riskRating: Annotation(),
  reasoning: Annotation(),
  
  // Running logs
  thoughtLogs: Annotation({
    reducer: (left, right) => left.concat(right),
    default: () => []
  })
});

/**
 * Resolves the LLM clients based on .env configuration
 * Supports multiple comma-separated Gemini API keys for automatic key-rotation failover
 */
function getLLMClients() {
  const geminiKeyRaw = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const clients = [];

  const geminiKeys = geminiKeyRaw
    ? geminiKeyRaw.split(',').map(k => k.trim()).filter(Boolean)
    : [];

  const geminiClients = geminiKeys.map((key) => ({
    type: 'gemini',
    client: new GoogleGenerativeAI(key),
    modelNames: [
      process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-2.5-pro'
    ]
  }));

  const openaiClient = openaiKey ? {
    type: 'openai',
    client: new OpenAI({ apiKey: openaiKey }),
    modelNames: [
      process.env.OPENAI_MODEL || 'gpt-4o-mini',
      'gpt-4o-mini',
      'gpt-4'
    ]
  } : null;

  const primaryProvider = process.env.DEFAULT_PROVIDER || 'gemini';

  if (primaryProvider === 'gemini') {
    clients.push(...geminiClients);
    if (openaiClient) clients.push(openaiClient);
  } else {
    if (openaiClient) clients.push(openaiClient);
    clients.push(...geminiClients);
  }

  return clients;
}

/**
 * Helper to strip markdown formatting and repair minor JSON anomalies (like trailing commas or control characters)
 */
function cleanAndParseJson(rawText) {
  let text = rawText.trim();
  
  // Strip markdown wraps if present
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  
  text = text.trim();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("[LLM] Standard JSON parse failed, attempting regex repairs on text:", text.slice(0, 100) + "...");
    try {
      // 1. Remove trailing commas before closing braces/brackets
      // 2. Remove illegal unescaped control characters (ASCII 0-31)
      const repaired = text
        .replace(/,\s*([\]}])/g, '$1') 
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      return JSON.parse(repaired);
    } catch (repairError) {
      console.error("[LLM Error] JSON repair failed. Original error:", error.message);
      throw new Error(`API returned invalid JSON format: ${error.message}`);
    }
  }
}

async function callLLMJson(systemInstruction, userPrompt, responseSchema = null) {
  const clients = getLLMClients();
  if (clients.length === 0) {
    throw new Error("No LLM API keys configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your .env file.");
  }

  let lastError = null;

  for (const llm of clients) {
    // Unique the list of models for this client
    const modelsToTry = [];
    for (const name of llm.modelNames) {
      if (!modelsToTry.includes(name)) {
        modelsToTry.push(name);
      }
    }

    for (const modelName of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          if (llm.type === 'gemini') {
            console.log(`[LLM] Attempting generation with model: ${modelName} (Attempt ${attempts}/${maxAttempts})`);
            const model = llm.client.getGenerativeModel({
              model: modelName,
              systemInstruction: systemInstruction
            });
            
            const generationConfig = {
              responseMimeType: 'application/json'
            };
            if (responseSchema) {
              generationConfig.responseSchema = responseSchema;
            }
            
            const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              generationConfig
            });

            const text = result.response.text();
            return cleanAndParseJson(text);
          } else {
            console.log(`[LLM] Attempting generation with OpenAI model: ${modelName} (Attempt ${attempts}/${maxAttempts})`);
            const response = await llm.client.chat.completions.create({
              model: modelName,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.2
            });

            const text = response.choices[0].message.content;
            return cleanAndParseJson(text);
          }
        } catch (error) {
          console.warn(`[LLM Warning] Model "${modelName}" failed on attempt ${attempts}:`, error.message);
          lastError = error;
          
          // Identify if it's a rate limit / quota error
          const isRateLimit = error.message.includes('429') || 
                              error.message.includes('quota') || 
                              error.message.includes('rate limit') ||
                              error.message.includes('Too Many Requests');
                              
          // Daily quota limits (e.g. PerDay, limit: 0) cannot be bypassed by waiting
          const isDailyLimit = error.message.includes('PerDay') || 
                               error.message.includes('daily') || 
                               error.message.includes('limit: 0') || 
                               error.message.includes('Daily');
                               
          const hasOtherClients = clients.length > 1;

          // Only delay and retry if we don't have other API keys/providers to failover to,
          // and it's a standard per-minute rate limit.
          if (isRateLimit && !isDailyLimit && !hasOtherClients && attempts < maxAttempts) {
            const delaySec = attempts * 5; // Wait 5s, then 10s
            console.log(`[LLM Rate Limit] Quota hit. Pausing for ${delaySec} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
            continue;
          }
          
          // If a model attempt fails, break and try the next fallback model/client immediately
          console.log(`[LLM] Model "${modelName}" failed. Trying next model/client...`);
          break;
        }
      }
    }
  }
  
  throw new Error(`All LLM models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

// Helper to write logs to callback
const sendProgress = (config, message) => {
  const callback = config?.configurable?.progressCallback;
  if (callback) {
    callback(message);
  }
};

/**
 * 1. NODE: Ticker Resolution
 */
async function tickerResolutionNode(state, config) {
  sendProgress(config, "Searching for company ticker symbol...");
  const ticker = await financeService.searchTicker(state.companyName);
  
  const log = ticker 
    ? `Resolved ticker symbol to "${ticker}"` 
    : `No public stock ticker found for "${state.companyName}". Proceeding as a private company.`;
  
  sendProgress(config, log);
  return {
    ticker: ticker || null,
    thoughtLogs: [log]
  };
}

/**
 * 2. NODE: Fetch Financials
 */
async function fetchFinancialsNode(state, config) {
  if (!state.ticker) {
    const log = "Skipping financial metrics download: No public ticker available.";
    sendProgress(config, log);
    return {
      financialSummary: {},
      chartData: [],
      thoughtLogs: [log]
    };
  }

  sendProgress(config, `Downloading financial statements and key stats for ${state.ticker}...`);
  const financialSummary = await financeService.fetchFinancials(state.ticker);
  
  sendProgress(config, `Fetching historical stock price chart for ${state.ticker}...`);
  const chartData = await financeService.fetchHistoricalChart(state.ticker);

  let log = "";
  if (financialSummary.error) {
    log = `Failed to download financial statements for ${state.ticker}: ${financialSummary.message}`;
  } else {
    log = `Successfully retrieved financial summary for ${state.ticker}. Stock Price: ${financialSummary.currentPrice} ${financialSummary.currency}.`;
  }

  sendProgress(config, log);
  return {
    financialSummary,
    chartData,
    thoughtLogs: [log]
  };
}

/**
 * 3. NODE: Web Search Research
 */
async function webSearchNode(state, config) {
  sendProgress(config, `Conducting web research on "${state.companyName}" (market news, competitors, and growth drivers)...`);
  let searchResults = await searchService.searchCompany(state.companyName);
  
  // Filter search results to ensure they are relevant to the query name
  const queryLower = state.companyName.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
  
  if (searchResults.length > 0 && queryWords.length > 0) {
    searchResults = searchResults.filter(item => {
      const titleLower = item.title.toLowerCase();
      const snippetLower = item.snippet.toLowerCase();
      return queryWords.some(word => titleLower.includes(word) || snippetLower.includes(word));
    });
  }
  
  const log = `Retrieved ${searchResults.length} relevant articles/discussions covering market landscape and risk elements.`;
  sendProgress(config, log);
  
  return {
    searchResults,
    thoughtLogs: [log]
  };
}

/**
 * 4. NODE: Fundamental Analysis
 */
async function analyzeFundamentalsNode(state, config) {
  sendProgress(config, "Analyzing company fundamentals...");
  
  const hasFinancials = state.financialSummary && Object.keys(state.financialSummary).length > 0 && !state.financialSummary.error;
  const hasSearch = state.searchResults && state.searchResults.length > 0;
  
  if (!hasFinancials && !hasSearch) {
    const log = `Aborted analysis: No relevant financial or web data found for company "${state.companyName}"`;
    sendProgress(config, log);
    return {
      fundamentalAnalysis: { strengths: [], weaknesses: [], metricsSummary: "No data available." },
      sentimentAnalysis: { opportunities: [], threats: [], sentiment: "Neutral", marketSentimentSummary: "No news available." },
      decision: "Pass",
      confidence: 0,
      riskRating: "High",
      reasoning: `# Research Aborted: Company Not Found\n\nNo public stock ticker or relevant web search results were found for "${state.companyName}". We were unable to gather any financial or market data to perform an investment analysis. Please check the spelling of the company name or search for a publicly active business.`,
      thoughtLogs: [log]
    };
  }

  const systemInstruction = `You are a Senior Financial Analyst. Analyze the financial metrics of the company and output a structured JSON analysis.
Response format must be exactly JSON:
{
  "strengths": ["list of financial strengths"],
  "weaknesses": ["list of financial weaknesses"],
  "metricsSummary": "2-3 sentences summarizing the financial health (solvency, margins, liquidity, valuation)"
}
CRITICAL: Do not include unescaped double quotes inside the JSON string values. If you need to use quotes inside a text string, use single quotes instead (e.g., 'quote' instead of \"quote\").`;

  let userPrompt = "";
  if (hasFinancials) {
    userPrompt = `Company: ${state.companyName} (${state.ticker})
Financial Summary Data:
${JSON.stringify(state.financialSummary, null, 2)}

Provide an expert assessment of their balance sheet, debt-to-equity ratios, profit margins, and revenue growth.`;
  } else {
    userPrompt = `Company: ${state.companyName} (Private/Unlisted)
Web Search Findings:
${JSON.stringify(state.searchResults, null, 2)}

As this is a private company with no public stock filings, analyze its apparent business scale, market presence, and financial traction based on web research.`;
  }

  const analysis = await callLLMJson(systemInstruction, userPrompt, fundamentalAnalysisSchema);
  const log = `Completed fundamental analysis: ${analysis.metricsSummary}`;
  sendProgress(config, "Fundamentals analysis completed.");
  
  return {
    fundamentalAnalysis: analysis,
    thoughtLogs: [log]
  };
}

/**
 * 5. NODE: Sentiment & Risk Analysis
 */
async function analyzeSentimentNode(state, config) {
  // If analysis was aborted, skip execution
  if (state.reasoning && state.reasoning.startsWith("# Research Aborted")) {
    return {};
  }

  sendProgress(config, "Evaluating news sentiment and competitive risks...");
  
  const systemInstruction = `You are a Market Researcher and Risk Analyst. Analyze recent news, market trends, and risk factors of the company and output a structured JSON analysis.
Response format must be exactly JSON:
{
  "opportunities": ["list of market opportunities/drivers"],
  "threats": ["list of risks/threats/competitors"],
  "sentiment": "Positive" | "Negative" | "Neutral",
  "marketSentimentSummary": "2-3 sentences summarizing current sentiment and risk profile"
}
CRITICAL: Do not include unescaped double quotes inside the JSON string values. If you need to use quotes inside a text string, use single quotes instead (e.g., 'quote' instead of \"quote\").`;

  const userPrompt = `Company: ${state.companyName}
Web Search Findings:
${JSON.stringify(state.searchResults, null, 2)}

Identify key competitor dynamics, macroeconomic headwind factors, executive changes, and general news sentiment.`;

  const analysis = await callLLMJson(systemInstruction, userPrompt, sentimentAnalysisSchema);
  const log = `Completed sentiment/risk analysis. Sentiment: ${analysis.sentiment}. Summary: ${analysis.marketSentimentSummary}`;
  sendProgress(config, "Sentiment & risk evaluation completed.");
  
  return {
    sentimentAnalysis: analysis,
    thoughtLogs: [log]
  };
}

/**
 * 6. NODE: Synthesize Decision
 */
async function synthesizeDecisionNode(state, config) {
  // If analysis was aborted, skip execution
  if (state.reasoning && state.reasoning.startsWith("# Research Aborted")) {
    return {};
  }

  sendProgress(config, "Synthesizing research data into a final recommendation...");
  
  const systemInstruction = `You are a Chief Investment Officer (CIO). Review the financial fundamentals and market sentiment of the company, and make a final investment decision: "Invest" or "Pass".
Response format must be exactly JSON:
{
  "decision": "Invest" or "Pass",
  "confidence": number between 0 and 100,
  "riskRating": "Low" or "Medium" or "High",
  "reasoning": "A detailed, professional markdown report (4-5 paragraphs) explaining the decision. CITE specific financial stats (such as P/E ratio, debt level, cash flows if available) and sentiment trends (competitor actions, industry trends, and regulatory/macro risks) to justify the decision, confidence score, and risk rating. Organize with headings."
}
CRITICAL: Do not include unescaped double quotes inside the JSON string values. If you need to use quotes inside a text string, use single quotes instead (e.g., 'quote' instead of \"quote\").`;

  const userPrompt = `Company Name: ${state.companyName}
Stock Ticker: ${state.ticker || 'N/A (Private)'}

--- FINANCIAL ANALYSIS SUMMARY ---
${JSON.stringify(state.fundamentalAnalysis, null, 2)}

--- SENTIMENT & RISK SUMMARY ---
${JSON.stringify(state.sentimentAnalysis, null, 2)}

--- DATA METRICS BACKUP ---
Financial Data: ${JSON.stringify(state.financialSummary)}
Search Snippets: ${JSON.stringify(state.searchResults)}

Formulate your final investment thesis. Be objective and critical. If data is limited (e.g. private company), adjust confidence and risk rating accordingly and note this in reasoning.`;

  const synthesis = await callLLMJson(systemInstruction, userPrompt, synthesisDecisionSchema);
  
  const log = `Final synthesis compiled. Decision: ${synthesis.decision} | Confidence: ${synthesis.confidence}% | Risk: ${synthesis.riskRating}`;
  sendProgress(config, "Final investment recommendation compiled.");
  
  return {
    decision: synthesis.decision,
    confidence: synthesis.confidence,
    riskRating: synthesis.riskRating,
    reasoning: synthesis.reasoning,
    thoughtLogs: [log]
  };
}

// Compile the StateGraph workflow
const workflow = new StateGraph(StateAnnotation)
  .addNode("tickerResolution", tickerResolutionNode)
  .addNode("fetchFinancials", fetchFinancialsNode)
  .addNode("webSearch", webSearchNode)
  .addNode("analyzeFundamentals", analyzeFundamentalsNode)
  .addNode("analyzeSentiment", analyzeSentimentNode)
  .addNode("synthesizeDecision", synthesizeDecisionNode)
  
  // Establish edge connections
  .addEdge(START, "tickerResolution")
  .addEdge("tickerResolution", "fetchFinancials")
  .addEdge("fetchFinancials", "webSearch")
  .addEdge("webSearch", "analyzeFundamentals")
  .addEdge("analyzeFundamentals", "analyzeSentiment")
  .addEdge("analyzeSentiment", "synthesizeDecision")
  .addEdge("synthesizeDecision", END);

const app = workflow.compile();

export const agentGraph = {
  /**
   * Run the complete investment research workflow for a company
   * @param {string} companyName 
   * @param {function} progressCallback Callback function to stream real-time logs
   * @returns {Promise<object>} Final output state
   */
  async run(companyName, progressCallback) {
    console.log(`[AgentGraph] Starting execution graph for: "${companyName}"`);
    
    // Invoke graph, passing our custom progress callback via config
    const finalState = await app.invoke(
      { companyName },
      {
        configurable: {
          progressCallback
        }
      }
    );
    
    return finalState;
  }
};
