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

const companyResolutionSchema = {
  type: "object",
  properties: {
    matched: {
      type: "boolean",
      description: "Whether a real, publicly-known company was identified"
    },
    companyName: {
      type: "string",
      description: "The canonical official company name, or empty string if not matched"
    },
    ticker: {
      type: "string",
      description: "Stock ticker symbol if publicly listed, or empty string if private/unlisted"
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Confidence in the company match"
    },
    alternativeMatches: {
      type: "array",
      items: { type: "string" },
      description: "Other plausible company names the user might have meant"
    },
    reasoning: {
      type: "string",
      description: "Explanation of how the input was interpreted and matched"
    },
    isPubliclyListed: {
      type: "boolean",
      description: "Whether the company appears to be publicly traded on a stock exchange"
    }
  },
  required: ["matched", "confidence", "alternativeMatches", "reasoning", "isPubliclyListed"]
};

const limitedDataSummarySchema = {
  type: "object",
  properties: {
    businessDescription: {
      type: "string",
      description: "Brief description of what the company does"
    },
    fundingStatus: {
      type: "string",
      description: "Known funding stage, ownership, or listing status"
    },
    qualitativeHighlights: {
      type: "array",
      items: { type: "string" },
      description: "Key qualitative facts available from web research"
    },
    reasoning: {
      type: "string",
      description: "Markdown explanation of why a full investment decision cannot be made"
    }
  },
  required: ["businessDescription", "fundingStatus", "qualitativeHighlights", "reasoning"]
};

// Define the State schema using LangGraph's Annotation
const StateAnnotation = Annotation.Root({
  companyName: Annotation(),
  originalUserInput: Annotation(),
  ticker: Annotation(),
  financialSummary: Annotation(),
  chartData: Annotation(),
  searchResults: Annotation(),
  fundamentalAnalysis: Annotation(),
  sentimentAnalysis: Annotation(),

  // Company resolution
  companyResolution: Annotation(),
  resolutionStatus: Annotation(),
  resolvedCompany: Annotation(),
  companyVerified: Annotation(),

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

function hasUsableFinancials(financialSummary) {
  return financialSummary
    && Object.keys(financialSummary).length > 0
    && !financialSummary.error
    && financialSummary.currentPrice != null;
}

function hasSearchResults(searchResults) {
  return searchResults && searchResults.length > 0;
}

/**
 * 0. NODE: Company Resolution (LLM + external verification)
 */
async function companyResolutionNode(state, config) {
  const rawInput = state.originalUserInput || state.companyName;
  sendProgress(config, `Resolving company identity for "${rawInput}"...`);

  const systemInstruction = `You are a company identification specialist for an investment research platform.
Given a raw user query (which may contain typos, abbreviations, or informal names), identify the most likely real, publicly-known company or organization they mean.

Rules:
- Handle common typos and fuzzy matches (e.g. "bjyus" -> "Byju's", "nvida" -> "Nvidia").
- If the input is gibberish or refers to no real company, set matched=false and confidence="low".
- If multiple distinct companies could match, list them in alternativeMatches and use confidence="medium".
- Only set confidence="high" when you are very confident about a single specific company.
- For private/unlisted companies (e.g. Stripe, Byju's), set isPubliclyListed=false and ticker to empty string, but still match if they are well-known.
- Do NOT invent companies. If unsure, prefer matched=false or confidence="medium"/"low".
- reasoning must explain your interpretation clearly for audit purposes.

Output JSON only with fields: matched, companyName, ticker, confidence, alternativeMatches, reasoning, isPubliclyListed.`;

  const userPrompt = `User input: "${rawInput}"

Identify the most likely real company this refers to.`;

  const llmResolution = await callLLMJson(systemInstruction, userPrompt, companyResolutionSchema);

  const normalizedResolution = {
    matched: Boolean(llmResolution.matched),
    companyName: llmResolution.companyName?.trim() || null,
    ticker: llmResolution.ticker?.trim() || null,
    confidence: llmResolution.confidence || 'low',
    alternativeMatches: Array.isArray(llmResolution.alternativeMatches) ? llmResolution.alternativeMatches : [],
    reasoning: llmResolution.reasoning || '',
    isPubliclyListed: Boolean(llmResolution.isPubliclyListed)
  };

  sendProgress(config, `LLM resolution: ${normalizedResolution.matched ? normalizedResolution.companyName : 'no match'} (confidence: ${normalizedResolution.confidence})`);

  let verified = false;
  let verificationSource = 'none';
  let verifiedTicker = normalizedResolution.ticker;
  let verifiedName = normalizedResolution.companyName;

  if (normalizedResolution.matched && normalizedResolution.companyName) {
    sendProgress(config, `Cross-checking "${normalizedResolution.companyName}" against Yahoo Finance...`);
    const yahooCheck = await financeService.verifyCompany(
      normalizedResolution.companyName,
      normalizedResolution.ticker
    );

    if (yahooCheck.verified) {
      verified = true;
      verificationSource = yahooCheck.source;
      verifiedName = yahooCheck.officialName || normalizedResolution.companyName;
      if (yahooCheck.ticker) {
        verifiedTicker = yahooCheck.ticker;
        normalizedResolution.isPubliclyListed = true;
      }
    } else if (!normalizedResolution.isPubliclyListed) {
      sendProgress(config, `No public ticker found; verifying private company via web search...`);
      const webResults = await searchService.search(
        `"${normalizedResolution.companyName}" company official`,
        3
      );
      const nameLower = normalizedResolution.companyName.toLowerCase();
      const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);
      const webVerified = webResults.some((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return nameWords.some((w) => text.includes(w));
      });
      if (webVerified) {
        verified = true;
        verificationSource = 'web_search';
      }
    }
  }

  const resolutionLog = [
    `Company Resolution for "${rawInput}": matched=${normalizedResolution.matched}, confidence=${normalizedResolution.confidence}, verified=${verified}`,
    `LLM reasoning: ${normalizedResolution.reasoning}`,
    verified
      ? `Verified via ${verificationSource}: "${verifiedName}"${verifiedTicker ? ` (${verifiedTicker})` : ' (private/unlisted)'}`
      : `Verification failed — could not confirm company exists in external data sources`
  ].join('\n');

  sendProgress(config, verified
    ? `Verified company: ${verifiedName}${verifiedTicker ? ` (${verifiedTicker})` : ''}`
    : `Could not verify company existence for "${rawInput}"`);

  const resolvedCompany = normalizedResolution.matched ? {
    companyName: verifiedName || normalizedResolution.companyName,
    ticker: verifiedTicker,
    confidence: normalizedResolution.confidence,
    verified,
    isPubliclyListed: normalizedResolution.isPubliclyListed,
    originalInput: rawInput
  } : null;

  return {
    companyResolution: normalizedResolution,
    companyVerified: verified,
    resolvedCompany,
    companyName: verified && verifiedName ? verifiedName : state.companyName,
    thoughtLogs: [resolutionLog]
  };
}

/**
 * Routing after company resolution
 */
function routeAfterResolution(state) {
  const resolution = state.companyResolution;
  if (!resolution) return 'notFoundResponse';

  if (!resolution.matched || resolution.confidence === 'low' || !state.companyVerified) {
    return 'notFoundResponse';
  }

  if (
    resolution.confidence === 'medium'
    || (resolution.alternativeMatches && resolution.alternativeMatches.length > 0)
  ) {
    return 'ambiguousResponse';
  }

  if (resolution.confidence === 'high' && state.companyVerified) {
    return 'tickerResolution';
  }

  return 'notFoundResponse';
}

/**
 * NODE: Not Found — stop pipeline immediately
 */
async function notFoundResponseNode(state, config) {
  const rawInput = state.originalUserInput || state.companyName;
  const resolution = state.companyResolution || {};
  const alternatives = resolution.alternativeMatches || [];

  sendProgress(config, `Company not found: could not identify a real company matching "${rawInput}".`);

  const reasoning = `# Company Not Found

We couldn't confidently identify a real company matching **"${rawInput}"**.

${resolution.reasoning ? `**Resolution notes:** ${resolution.reasoning}` : ''}

Please check the spelling or try the official company or ticker name.`;

  return {
    resolutionStatus: 'not_found',
    decision: 'Unresolved',
    confidence: 0,
    riskRating: 'N/A',
    reasoning,
    financialSummary: {},
    chartData: [],
    searchResults: [],
    fundamentalAnalysis: {},
    sentimentAnalysis: {},
    thoughtLogs: [`Pipeline halted: company not found for "${rawInput}". Alternatives: ${alternatives.join(', ') || 'none'}`]
  };
}

/**
 * NODE: Ambiguous — stop pipeline, ask user to disambiguate
 */
async function ambiguousResponseNode(state, config) {
  const rawInput = state.originalUserInput || state.companyName;
  const resolution = state.companyResolution || {};
  const resolved = state.resolvedCompany || {};
  const alternatives = resolution.alternativeMatches || [];

  sendProgress(config, `Ambiguous match for "${rawInput}" — user confirmation required.`);

  const primaryName = resolved.companyName || resolution.companyName;
  const listingNote = resolution.isPubliclyListed
    ? (resolved.ticker ? ` (${resolved.ticker})` : '')
    : ' — not publicly listed, so research will be limited';

  const reasoning = `# Did You Mean This Company?

Your search for **"${rawInput}"** could match multiple companies or needs confirmation.

**Most likely match:** ${primaryName}${listingNote}

${resolution.reasoning ? `**Why:** ${resolution.reasoning}` : ''}

Please confirm which company you meant, or refine your search using the official company or ticker name.`;

  return {
    resolutionStatus: 'ambiguous',
    decision: 'Unresolved',
    confidence: 0,
    riskRating: 'N/A',
    reasoning,
    financialSummary: {},
    chartData: [],
    searchResults: [],
    fundamentalAnalysis: {},
    sentimentAnalysis: {},
    thoughtLogs: [`Pipeline halted: ambiguous match for "${rawInput}". Candidates: ${[primaryName, ...alternatives].filter(Boolean).join('; ')}`]
  };
}

/**
 * NODE: Limited Data — company identified but no usable research data
 */
async function limitedDataResponseNode(state, config) {
  const company = state.resolvedCompany?.companyName || state.companyName;
  sendProgress(config, `Insufficient data for ${company} — generating qualitative summary only.`);

  const hasSearch = hasSearchResults(state.searchResults);

  let summary;
  if (hasSearch) {
    const systemInstruction = `You are a business research analyst. The company was identified but lacks public financial data (likely private or obscure). Summarize what qualitative information IS available from web research. Do NOT fabricate financial metrics. Output JSON only.`;
    const userPrompt = `Company: ${company}
Ticker: ${state.ticker || 'None (private/unlisted)'}

Web Research:
${JSON.stringify(state.searchResults, null, 2)}

Provide a qualitative summary only.`;

    summary = await callLLMJson(systemInstruction, userPrompt, limitedDataSummarySchema);
  } else {
    summary = {
      businessDescription: `${company} was identified but no financial or web research data could be retrieved.`,
      fundingStatus: state.resolvedCompany?.isPubliclyListed === false
        ? 'Appears to be privately held or not publicly traded.'
        : 'Listing status unknown.',
      qualitativeHighlights: [],
      reasoning: `No public financial filings or relevant web articles were found for **${company}**.`
    };
  }

  const reasoning = `# Limited Data Available

**${company}** was identified, but sufficient financial data isn't available to generate an investment decision (e.g. it may be privately held or not publicly traded).

## Business Overview
${summary.businessDescription}

## Ownership / Listing Status
${summary.fundingStatus}

${summary.qualitativeHighlights?.length > 0 ? `## Available Qualitative Information\n${summary.qualitativeHighlights.map((h) => `- ${h}`).join('\n')}` : ''}

${summary.reasoning}`;

  sendProgress(config, `Qualitative summary compiled for ${company} (no investment decision generated).`);

  return {
    resolutionStatus: 'limited_data',
    decision: 'Unavailable',
    confidence: 0,
    riskRating: 'N/A',
    reasoning,
    fundamentalAnalysis: {
      strengths: summary.qualitativeHighlights || [],
      weaknesses: [],
      metricsSummary: summary.businessDescription
    },
    sentimentAnalysis: {
      opportunities: [],
      threats: [],
      sentiment: 'Neutral',
      marketSentimentSummary: summary.fundingStatus
    },
    thoughtLogs: [`Limited data path: ${company} identified but insufficient data for full investment analysis.`]
  };
}

/**
 * Routing after sentiment — skip full synthesis if no financials
 */
function routeAfterSentiment(state) {
  if (state.resolutionStatus === 'limited_data') {
    return END;
  }

  const hasFinancials = hasUsableFinancials(state.financialSummary);

  if (!hasFinancials) {
    return 'limitedDataFinalize';
  }

  return 'synthesizeDecision';
}

/**
 * NODE: Limited Data Finalize — partial web-based analysis without Invest/Pass decision
 */
async function limitedDataFinalizeNode(state, config) {
  const company = state.resolvedCompany?.companyName || state.companyName;
  sendProgress(config, `Compiling qualitative research report for ${company} (no financial metrics available)...`);

  const systemInstruction = `You are a business research analyst. Summarize qualitative findings for a company that lacks public financial data. Do NOT assign Invest/Pass decisions or confidence scores. Do NOT invent financial metrics. Output JSON only.`;

  const userPrompt = `Company: ${company}

Fundamental Analysis:
${JSON.stringify(state.fundamentalAnalysis, null, 2)}

Sentiment Analysis:
${JSON.stringify(state.sentimentAnalysis, null, 2)}

Web Research:
${JSON.stringify(state.searchResults, null, 2)}

Provide a qualitative summary explaining why a full investment decision cannot be made.`;

  const summary = await callLLMJson(systemInstruction, userPrompt, limitedDataSummarySchema);

  const reasoning = `# Limited Data Available

**${company}** was identified, but sufficient financial data isn't available to generate an investment decision (e.g. it may be privately held or not publicly traded).

## Business Overview
${summary.businessDescription}

## Ownership / Listing Status
${summary.fundingStatus}

${summary.qualitativeHighlights?.length > 0 ? `## Available Qualitative Information\n${summary.qualitativeHighlights.map((h) => `- ${h}`).join('\n')}` : ''}

${summary.reasoning}`;

  sendProgress(config, `Qualitative report ready for ${company}.`);

  return {
    resolutionStatus: 'limited_data',
    decision: 'Unavailable',
    confidence: 0,
    riskRating: 'N/A',
    reasoning,
    thoughtLogs: [`Limited data finalize: qualitative report for ${company} without investment decision.`]
  };
}

/**
 * 1. NODE: Ticker Resolution
 */
async function tickerResolutionNode(state, config) {
  sendProgress(config, "Searching for company ticker symbol...");
  const resolvedName = state.resolvedCompany?.companyName || state.companyName;
  const preResolvedTicker = state.resolvedCompany?.ticker;

  let ticker = preResolvedTicker || null;
  if (!ticker) {
    ticker = await financeService.searchTicker(resolvedName);
  }
  
  const log = ticker 
    ? `Resolved ticker symbol to "${ticker}" for ${resolvedName}` 
    : `No public stock ticker found for "${resolvedName}". Proceeding as a private company.`;
  
  sendProgress(config, log);
  return {
    resolutionStatus: 'resolved',
    ticker: ticker || null,
    companyName: resolvedName,
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
  const searchName = state.resolvedCompany?.companyName || state.companyName;
  sendProgress(config, `Conducting web research on "${searchName}" (market news, competitors, and growth drivers)...`);
  let searchResults = await searchService.searchCompany(searchName);
  
  // Filter search results to ensure they are relevant to the query name
  const queryLower = searchName.toLowerCase().trim();
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
  
  const hasFinancials = hasUsableFinancials(state.financialSummary);
  const hasSearch = hasSearchResults(state.searchResults);
  const company = state.resolvedCompany?.companyName || state.companyName;

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
    userPrompt = `Company: ${company} (${state.ticker})
Financial Summary Data:
${JSON.stringify(state.financialSummary, null, 2)}

Provide an expert assessment of their balance sheet, debt-to-equity ratios, profit margins, and revenue growth.`;
  } else {
    userPrompt = `Company: ${company} (Private/Unlisted)
Web Search Findings:
${JSON.stringify(state.searchResults, null, 2)}

As this is a private company with no public stock filings, analyze its apparent business scale, market presence, and financial traction based on web research only. Do NOT invent specific financial metrics.`;
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
  if (state.resolutionStatus === 'limited_data') {
    return {};
  }

  sendProgress(config, "Evaluating news sentiment and competitive risks...");
  
  const company = state.resolvedCompany?.companyName || state.companyName;
  const systemInstruction = `You are a Market Researcher and Risk Analyst. Analyze recent news, market trends, and risk factors of the company and output a structured JSON analysis.
Response format must be exactly JSON:
{
  "opportunities": ["list of market opportunities/drivers"],
  "threats": ["list of risks/threats/competitors"],
  "sentiment": "Positive" | "Negative" | "Neutral",
  "marketSentimentSummary": "2-3 sentences summarizing current sentiment and risk profile"
}
CRITICAL: Do not include unescaped double quotes inside the JSON string values. If you need to use quotes inside a text string, use single quotes instead (e.g., 'quote' instead of \"quote\").`;

  const userPrompt = `Company: ${company}
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
  if (state.resolutionStatus === 'limited_data') {
    return {};
  }

  sendProgress(config, "Synthesizing research data into a final recommendation...");
  
  const company = state.resolvedCompany?.companyName || state.companyName;
  const systemInstruction = `You are a Chief Investment Officer (CIO). Review the financial fundamentals and market sentiment of the company, and make a final investment decision: "Invest" or "Pass".
Response format must be exactly JSON:
{
  "decision": "Invest" or "Pass",
  "confidence": number between 0 and 100,
  "riskRating": "Low" or "Medium" or "High",
  "reasoning": "A detailed, professional markdown report (4-5 paragraphs) explaining the decision. CITE specific financial stats (such as P/E ratio, debt level, cash flows if available) and sentiment trends (competitor actions, industry trends, and regulatory/macro risks) to justify the decision, confidence score, and risk rating. Organize with headings."
}
CRITICAL: Do not include unescaped double quotes inside the JSON string values. If you need to use quotes inside a text string, use single quotes instead (e.g., 'quote' instead of \"quote\").`;

  const userPrompt = `Company Name: ${company}
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
    resolutionStatus: 'resolved',
    decision: synthesis.decision,
    confidence: synthesis.confidence,
    riskRating: synthesis.riskRating,
    reasoning: synthesis.reasoning,
    thoughtLogs: [log]
  };
}

function routeAfterWebSearch(state) {
  const hasFinancials = hasUsableFinancials(state.financialSummary);
  const hasSearch = hasSearchResults(state.searchResults);

  if (!hasFinancials && !hasSearch) {
    return 'limitedDataResponse';
  }

  return 'analyzeFundamentals';
}

// Compile the StateGraph workflow
const workflow = new StateGraph(StateAnnotation)
  .addNode("resolveCompany", companyResolutionNode)
  .addNode("notFoundResponse", notFoundResponseNode)
  .addNode("ambiguousResponse", ambiguousResponseNode)
  .addNode("tickerResolution", tickerResolutionNode)
  .addNode("fetchFinancials", fetchFinancialsNode)
  .addNode("webSearch", webSearchNode)
  .addNode("limitedDataResponse", limitedDataResponseNode)
  .addNode("limitedDataFinalize", limitedDataFinalizeNode)
  .addNode("analyzeFundamentals", analyzeFundamentalsNode)
  .addNode("analyzeSentiment", analyzeSentimentNode)
  .addNode("synthesizeDecision", synthesizeDecisionNode)

  .addEdge(START, "resolveCompany")
  .addConditionalEdges("resolveCompany", routeAfterResolution, {
    tickerResolution: "tickerResolution",
    notFoundResponse: "notFoundResponse",
    ambiguousResponse: "ambiguousResponse"
  })
  .addEdge("notFoundResponse", END)
  .addEdge("ambiguousResponse", END)
  .addEdge("tickerResolution", "fetchFinancials")
  .addEdge("fetchFinancials", "webSearch")
  .addConditionalEdges("webSearch", routeAfterWebSearch, {
    limitedDataResponse: "limitedDataResponse",
    analyzeFundamentals: "analyzeFundamentals"
  })
  .addEdge("limitedDataResponse", END)
  .addEdge("analyzeFundamentals", "analyzeSentiment")
  .addConditionalEdges("analyzeSentiment", routeAfterSentiment, {
    limitedDataFinalize: "limitedDataFinalize",
    synthesizeDecision: "synthesizeDecision"
  })
  .addEdge("limitedDataFinalize", END)
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
    
    const finalState = await app.invoke(
      {
        companyName,
        originalUserInput: companyName
      },
      {
        configurable: {
          progressCallback
        }
      }
    );
    
    return finalState;
  }
};
