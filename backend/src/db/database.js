import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB file in the backend root
const dbPath = path.resolve(__dirname, '../../database.sqlite');
console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

const db = new DatabaseSync(dbPath);

// Create the tables
db.exec(`
  CREATE TABLE IF NOT EXISTS research_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    ticker TEXT,
    decision TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    risk_rating TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    financial_summary TEXT,
    search_results TEXT,
    thought_logs TEXT,
    fundamental_analysis TEXT,
    sentiment_analysis TEXT,
    feedback_status TEXT DEFAULT 'none',
    feedback_comment TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// Run self-healing schema updates for existing databases (adds missing columns if needed)
try {
  db.exec(`ALTER TABLE research_runs ADD COLUMN fundamental_analysis TEXT`);
} catch (e) {
  // Ignore: Column already exists
}
try {
  db.exec(`ALTER TABLE research_runs ADD COLUMN sentiment_analysis TEXT`);
} catch (e) {
  // Ignore: Column already exists
}

export const database = {
  /**
   * Save a new research run
   */
  saveRun(run) {
    const query = db.prepare(`
      INSERT INTO research_runs (
        company_name, ticker, decision, confidence, risk_rating, 
        reasoning, financial_summary, search_results, thought_logs,
        fundamental_analysis, sentiment_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = query.run(
      run.companyName,
      run.ticker || null,
      run.decision,
      run.confidence,
      run.riskRating,
      run.reasoning,
      JSON.stringify(run.financialSummary || {}),
      JSON.stringify(run.searchResults || []),
      JSON.stringify(run.thoughtLogs || []),
      JSON.stringify(run.fundamentalAnalysis || {}),
      JSON.stringify(run.sentimentAnalysis || {})
    );
    
    return result.lastInsertRowid;
  },

  /**
   * Retrieve all past research runs (summarized for history lists)
   */
  getAllRuns() {
    const query = db.prepare(`
      SELECT id, company_name, ticker, decision, confidence, risk_rating, feedback_status, created_at 
      FROM research_runs 
      ORDER BY id DESC
    `);
    
    return query.all().map(row => ({
      id: row.id,
      companyName: row.company_name,
      ticker: row.ticker,
      decision: row.decision,
      confidence: row.confidence,
      riskRating: row.risk_rating,
      feedbackStatus: row.feedback_status,
      createdAt: row.created_at
    }));
  },

  /**
   * Get complete details of a single research run
   */
  getRunById(id) {
    const query = db.prepare(`
      SELECT * FROM research_runs WHERE id = ?
    `);
    const row = query.get(id);
    if (!row) return null;

    return {
      id: row.id,
      companyName: row.company_name,
      ticker: row.ticker,
      decision: row.decision,
      confidence: row.confidence,
      riskRating: row.risk_rating,
      reasoning: row.reasoning,
      financialSummary: JSON.parse(row.financial_summary || '{}'),
      searchResults: JSON.parse(row.search_results || '[]'),
      thoughtLogs: JSON.parse(row.thought_logs || '[]'),
      fundamentalAnalysis: JSON.parse(row.fundamental_analysis || '{}'),
      sentimentAnalysis: JSON.parse(row.sentiment_analysis || '{}'),
      feedbackStatus: row.feedback_status,
      feedbackComment: row.feedback_comment,
      createdAt: row.created_at
    };
  },

  /**
   * Check if a recent run exists for the company to act as a cache
   */
  getRecentRunByCompany(companyName, daysLimit = 7) {
    const query = db.prepare(`
      SELECT * FROM research_runs 
      WHERE LOWER(company_name) = LOWER(?)
        AND datetime(created_at) >= datetime('now', '-' || ? || ' day', 'localtime')
      ORDER BY id DESC LIMIT 1
    `);
    
    const row = query.get(companyName, daysLimit);
    if (!row) return null;
    return this.getRunById(row.id);
  },

  /**
   * Save user feedback for a run
   */
  saveFeedback(id, status, comment = '') {
    const query = db.prepare(`
      UPDATE research_runs 
      SET feedback_status = ?, feedback_comment = ? 
      WHERE id = ?
    `);
    
    const result = query.run(status, comment, id);
    return result.changes > 0;
  }
};
