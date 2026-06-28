import { useState, useEffect, useCallback } from 'react';
import { databases, ID, Query, DB_ID, WATCHLIST_COL } from '../lib/appwrite';

/**
 * useWatchlist — Appwrite Database-backed watchlist hook.
 *
 * Interface is identical to the old localStorage version so no UI changes needed.
 * Documents in the watchlist collection must have these attributes:
 *   userId        (string)   — scoped to the logged-in user
 *   companyName   (string)
 *   ticker        (string, optional)
 *   decision      (string, optional)
 *   confidence    (integer, optional)
 *   riskRating    (string, optional)
 *   addedAt       (datetime)
 *
 * To swap back to localStorage just replace the three functions marked below.
 */
export function useWatchlist(userId) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  // ── FETCH ──
  const fetchItems = useCallback(async () => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    setLoading(true);
    try {
      const res = await databases.listDocuments(DB_ID, WATCHLIST_COL, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]);
      // Sort client-side descending by $createdAt (always available)
      const sorted = res.documents
        .slice()
        .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
      setItems(sorted.map(docToItem));
    } catch (err) {
      console.error('[Watchlist] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── ADD ──
  const addItem = useCallback(async (run) => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    if (items.some(i => i.companyName === run.companyName)) return;

    // Map our field names to your Appwrite schema.
    // Your schema has: symbol (ticker), addedAt (datetime, required)
    const now = new Date().toISOString();
    const doc = {
      userId,
      companyName: run.companyName,
      symbol:      run.ticker     || '',
      decision:    run.decision   || '',
      confidence:  run.confidence ?? 0,
      riskRating:  run.riskRating || '',
      addedAt:     now,
    };

    const optimistic = { id: 'temp-' + Date.now(), companyName: doc.companyName, ticker: doc.symbol, decision: doc.decision, confidence: doc.confidence, riskRating: doc.riskRating, addedAt: now };
    setItems(prev => [optimistic, ...prev]);

    try {
      const created = await databases.createDocument(DB_ID, WATCHLIST_COL, ID.unique(), doc);
      setItems(prev => prev.map(i => i.id === optimistic.id ? docToItem(created) : i));
    } catch (err) {
      console.error('[Watchlist] add error:', err);
      setItems(prev => prev.filter(i => i.id !== optimistic.id));
    }
  }, [userId, items]);

  // ── REMOVE (swap: databases.deleteDocument → your backend call) ──
  const removeItem = useCallback(async (companyName) => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    const target = items.find(i => i.companyName === companyName);
    if (!target) return;

    setItems(prev => prev.filter(i => i.companyName !== companyName)); // optimistic

    try {
      await databases.deleteDocument(DB_ID, WATCHLIST_COL, target.$id || target.id);
    } catch (err) {
      console.error('[Watchlist] remove error:', err);
      fetchItems(); // re-sync on failure
    }
  }, [userId, items, fetchItems]);

  const isWatched = useCallback((companyName) => {
    return items.some(i => i.companyName === companyName);
  }, [items]);

  return { items, loading, addItem, removeItem, isWatched };
}

// Map an Appwrite document to a plain item object
function docToItem(doc) {
  return {
    $id:         doc.$id,
    id:          doc.$id,
    userId:      doc.userId,
    companyName: doc.companyName,
    ticker:      doc.symbol      || doc.ticker || null,
    decision:    doc.decision    || null,
    confidence:  doc.confidence  ?? null,
    riskRating:  doc.riskRating  || null,
    addedAt:     doc.addedAt     || doc.$createdAt || null,
  };
}
