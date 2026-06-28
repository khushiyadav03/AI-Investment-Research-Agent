import YahooFinance from 'yahoo-finance2';

// Suppress Yahoo Finance survey alerts in output
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

function isNameCloseEnough(query, symbol, longName, shortName) {
  const q = query.toLowerCase().trim();
  const sym = (symbol || '').toLowerCase().trim();
  const long = (longName || '').toLowerCase().trim();
  const short = (shortName || '').toLowerCase().trim();

  // If query is an exact match for the ticker symbol
  if (q === sym) return true;

  // If query is a substring of the resolved long name or short name
  if (long.includes(q) || short.includes(q)) return true;

  // If the resolved names contain the query words (to handle word reordering or extra words)
  const qWords = q.split(/\s+/).filter(w => w.length > 1);
  if (qWords.length > 0) {
    const matchesLong = qWords.every(w => long.includes(w));
    const matchesShort = qWords.every(w => short.includes(w));
    if (matchesLong || matchesShort) return true;
  }

  return false;
}

export const financeService = {
  /**
   * Search Yahoo Finance and return multiple candidate company matches
   * @param {string} companyName
   * @param {number} limit
   * @returns {Promise<Array<{symbol: string, name: string, longName: string, shortName: string, quoteType: string, exchange: string}>>}
   */
  async searchCompanies(companyName, limit = 8) {
    try {
      console.log(`[FinanceService] Searching companies for: "${companyName}"`);
      const searchResults = await yahooFinance.search(companyName);

      if (!searchResults?.quotes?.length) {
        return [];
      }

      const seen = new Set();
      const matches = [];

      for (const quote of searchResults.quotes) {
        if (!quote?.symbol || seen.has(quote.symbol)) continue;
        seen.add(quote.symbol);

        matches.push({
          symbol: quote.symbol,
          name: quote.name || quote.shortname || quote.longname || quote.symbol,
          longName: quote.longname || quote.name || quote.shortname || quote.symbol,
          shortName: quote.shortname || quote.name || quote.symbol,
          quoteType: quote.quoteType || 'UNKNOWN',
          exchange: quote.exchange || quote.exchDisp || ''
        });

        if (matches.length >= limit) break;
      }

      return matches;
    } catch (error) {
      console.error(`[FinanceService] Error searching companies for "${companyName}":`, error.message);
      return [];
    }
  },

  /**
   * Cross-check whether a company/ticker actually exists in Yahoo Finance
   * @param {string} companyName
   * @param {string|null} ticker
   * @returns {Promise<{verified: boolean, ticker: string|null, officialName: string|null, quoteType: string|null, source: string}>}
   */
  async verifyCompany(companyName, ticker = null) {
    try {
      const query = ticker || companyName;
      const candidates = await this.searchCompanies(query, 10);

      if (candidates.length === 0) {
        return { verified: false, ticker: null, officialName: null, quoteType: null, source: 'yahoo_finance' };
      }

      if (ticker) {
        const tickerMatch = candidates.find(
          (c) => c.symbol.toLowerCase() === ticker.toLowerCase()
        );
        if (tickerMatch) {
          return {
            verified: true,
            ticker: tickerMatch.symbol,
            officialName: tickerMatch.longName || tickerMatch.name,
            quoteType: tickerMatch.quoteType,
            source: 'yahoo_finance'
          };
        }
      }

      const nameMatch = candidates.find((c) =>
        isNameCloseEnough(companyName, c.symbol, c.longName, c.shortName)
      );

      if (nameMatch) {
        return {
          verified: true,
          ticker: nameMatch.quoteType === 'EQUITY' ? nameMatch.symbol : null,
          officialName: nameMatch.longName || nameMatch.name,
          quoteType: nameMatch.quoteType,
          source: 'yahoo_finance'
        };
      }

      const equity = candidates.find((c) => c.quoteType === 'EQUITY');
      if (equity && ticker && equity.symbol.toLowerCase() === ticker.toLowerCase()) {
        return {
          verified: true,
          ticker: equity.symbol,
          officialName: equity.longName || equity.name,
          quoteType: equity.quoteType,
          source: 'yahoo_finance'
        };
      }

      return { verified: false, ticker: null, officialName: null, quoteType: null, source: 'yahoo_finance' };
    } catch (error) {
      console.error(`[FinanceService] Error verifying company "${companyName}":`, error.message);
      return { verified: false, ticker: null, officialName: null, quoteType: null, source: 'yahoo_finance' };
    }
  },

  /**
   * Search for a company stock ticker by name
   * @param {string} companyName 
   * @returns {Promise<string|null>} Stock ticker symbol or null
   */
  async searchTicker(companyName) {
    try {
      console.log(`[FinanceService] Searching ticker for: "${companyName}"`);
      const searchResults = await yahooFinance.search(companyName);
      
      if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
        // Find the first equity result which is usually the primary ticker
        const equity = searchResults.quotes.find(q => q.quoteType === 'EQUITY');
        if (equity && isNameCloseEnough(companyName, equity.symbol, equity.longname || equity.name, equity.shortname)) {
          console.log(`[FinanceService] Ticker resolved to: ${equity.symbol} (${equity.longname || equity.shortname})`);
          return equity.symbol;
        }
        
        // Fallback to the absolute first quote
        const firstQuote = searchResults.quotes[0];
        if (firstQuote && isNameCloseEnough(companyName, firstQuote.symbol, firstQuote.longname || firstQuote.name, firstQuote.shortname)) {
          console.log(`[FinanceService] Ticker resolved to fallback: ${firstQuote.symbol}`);
          return firstQuote.symbol;
        }
      }
      
      console.log(`[FinanceService] No matching ticker found for: "${companyName}"`);
      return null;
    } catch (error) {
      console.error(`[FinanceService] Error searching ticker for "${companyName}":`, error.message);
      return null;
    }
  },

  /**
   * Fetch core financial statistics and quote info for a ticker
   * @param {string} ticker 
   * @returns {Promise<object>} Compiled financial statistics
   */
  async fetchFinancials(ticker) {
    try {
      console.log(`[FinanceService] Fetching quote details for: ${ticker}`);
      const quote = await yahooFinance.quote(ticker);
      
      console.log(`[FinanceService] Fetching quoteSummary modules for: ${ticker}`);
      const summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['financialData', 'defaultKeyStatistics']
      });

      const financialData = summary.financialData || {};
      const keyStats = summary.defaultKeyStatistics || {};

      return {
        symbol: ticker,
        companyName: quote.longName || quote.shortName || ticker,
        currentPrice: quote.regularMarketPrice || financialData.currentPrice,
        currency: quote.financialCurrency || financialData.financialCurrency || 'USD',
        marketCap: quote.marketCap || keyStats.enterpriseValue,
        peRatio: quote.trailingPE || keyStats.forwardPE,
        pegRatio: keyStats.pegRatio,
        bookValue: keyStats.bookValue,
        priceToBook: keyStats.priceToBook || quote.priceToBook,
        
        // Profitability Margins
        profitMargin: financialData.profitMargins || keyStats.profitMargins,
        operatingMargin: financialData.operatingMargins,
        grossMargin: financialData.grossMargins,
        ebitdaMargin: financialData.ebitdaMargins,
        
        // Growth Indicators
        revenueGrowth: financialData.revenueGrowth,
        earningsGrowth: financialData.earningsGrowth,
        
        // Health / Debt
        debtToEquity: financialData.debtToEquity,
        currentRatio: financialData.currentRatio,
        quickRatio: financialData.quickRatio,
        freeCashflow: financialData.freeCashflow,
        operatingCashflow: financialData.operatingCashflow,
        totalCash: financialData.totalCash,
        totalDebt: financialData.totalDebt,
        
        // Analyst sentiments
        targetMeanPrice: financialData.targetMeanPrice,
        recommendationKey: financialData.recommendationKey,
        recommendationMean: financialData.recommendationMean
      };
    } catch (error) {
      console.error(`[FinanceService] Error fetching financials for ${ticker}:`, error.message);
      // Return a basic shell with the ticker if details fetch fails
      return {
        symbol: ticker,
        error: true,
        message: error.message
      };
    }
  },

  /**
   * Fetch 1-year historical prices for rendering charts
   * @param {string} ticker 
   * @returns {Promise<Array>} Array of { date, close } points
   */
  async fetchHistoricalChart(ticker) {
    try {
      console.log(`[FinanceService] Fetching chart history for: ${ticker}`);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      
      const queryOptions = {
        period1: oneYearAgo.toISOString().split('T')[0],
        period2: today.toISOString().split('T')[0],
        interval: '1d'
      };
      
      const chartResult = await yahooFinance.chart(ticker, queryOptions);
      if (chartResult && chartResult.quotes && chartResult.quotes.length > 0) {
        // Filter out null/undefined close values and map to clean object list
        return chartResult.quotes
          .filter(q => q.close !== null && q.close !== undefined)
          .map(q => ({
            date: q.date.toISOString().split('T')[0],
            close: parseFloat(q.close.toFixed(2))
          }));
      }
      return [];
    } catch (error) {
      console.error(`[FinanceService] Error fetching chart for ${ticker}:`, error.message);
      return [];
    }
  }
};
