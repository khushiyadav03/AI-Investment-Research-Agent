import * as cheerio from 'cheerio';

export const searchService = {
  /**
   * Scrapes DuckDuckGo HTML search results for a query
   * @param {string} query 
   * @param {number} limit Max number of results to return
   * @returns {Promise<Array<{title: string, snippet: string, link: string}>>} Search results
   */
  async search(query, limit = 5) {
    try {
      console.log(`[SearchService] Querying DuckDuckGo: "${query}"`);
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      const results = [];
      
      $('.result__body').each((i, element) => {
        if (results.length >= limit) return;
        
        const titleLink = $(element).find('.result__snippet');
        const title = $(element).find('.result__a').text().trim();
        const snippet = titleLink.text().trim();
        let link = $(element).find('.result__url').text().trim();
        
        // Clean up links if needed
        if (link && !link.startsWith('http')) {
          link = `https://${link}`;
        }
        
        if (title && snippet) {
          results.push({ title, snippet, link });
        }
      });
      
      console.log(`[SearchService] Retrieved ${results.length} results for: "${query}"`);
      return results;
    } catch (error) {
      console.error(`[SearchService] Error searching for "${query}":`, error.message);
      return [];
    }
  },

  /**
   * Conducts comprehensive research on a company name
   * @param {string} companyName 
   * @returns {Promise<Array>} Combined search results
   */
  async searchCompany(companyName) {
    console.log(`[SearchService] Running multi-source research for: "${companyName}"`);
    
    // Run two distinct searches in parallel to capture news and risks
    const [newsResults, riskResults] = await Promise.all([
      this.search(`${companyName} news market share competitor trend 2025 2026`, 4),
      this.search(`${companyName} investment risks challenges controversy negative`, 4)
    ]);
    
    // Combine and deduplicate by URL link
    const seenLinks = new Set();
    const combined = [];
    
    for (const item of [...newsResults, ...riskResults]) {
      if (!seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        combined.push(item);
      }
    }
    
    return combined;
  }
};
