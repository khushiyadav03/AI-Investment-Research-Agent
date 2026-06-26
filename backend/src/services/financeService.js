import YahooFinance from 'yahoo-finance2';

// Suppress Yahoo Finance survey alerts in output
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export const financeService = {
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
        if (equity) {
          console.log(`[FinanceService] Ticker resolved to: ${equity.symbol} (${equity.longname || equity.shortname})`);
          return equity.symbol;
        }
        
        // Fallback to the absolute first quote
        const firstQuote = searchResults.quotes[0];
        console.log(`[FinanceService] Ticker resolved to fallback: ${firstQuote.symbol}`);
        return firstQuote.symbol;
      }
      
      console.log(`[FinanceService] No ticker found for: "${companyName}"`);
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
