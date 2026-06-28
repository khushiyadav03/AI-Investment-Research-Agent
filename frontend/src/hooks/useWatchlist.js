import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'insideinvest_watchlist';

/**
 * useWatchlist — localStorage-backed watchlist hook.
 * Swap the three functions below to Appwrite SDK calls when ready:
 *   getItems  → databases.listDocuments(DB_ID, COLLECTION_ID)
 *   addItem   → databases.createDocument(...)
 *   removeItem→ databases.deleteDocument(...)
 */
export function useWatchlist() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((run) => {
    const entry = {
      id: run.id ?? Date.now(),
      companyName: run.companyName,
      ticker: run.ticker || null,
      decision: run.decision || null,
      confidence: run.confidence ?? null,
      riskRating: run.riskRating || null,
      addedAt: new Date().toISOString(),
    };
    setItems(prev => prev.some(i => i.companyName === entry.companyName)
      ? prev
      : [entry, ...prev]
    );
  }, []);

  const removeItem = useCallback((companyName) => {
    setItems(prev => prev.filter(i => i.companyName !== companyName));
  }, []);

  const isWatched = useCallback((companyName) => {
    return items.some(i => i.companyName === companyName);
  }, [items]);

  return { items, addItem, removeItem, isWatched };
}
