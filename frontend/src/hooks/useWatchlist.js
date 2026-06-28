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

  // ── FETCH (swap: databases.listDocuments → your backend call) ──
  const fetchItems = useCallback(async () => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    setLoading(true);
    try {
      const res = await databases.listDocuments(DB_ID, WATCHLIST_COL, [
        Query.equal('userId', userId),
        Query.orderDesc('addedAt'),
        Query.limit(100),
      ]);
      setItems(res.documents.map(docToItem));
    } catch (err) {
      console.error('[Watchlist] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── ADD (swap: databases.createDocument → your backend call) ──
  const addItem = useCallback(async (run) => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    if (items.some(i => i.companyName === run.companyName)) return; // already watching

    const doc = {
      userId,
      companyName:  run.companyName,
      ticker:       run.ticker       || '',
      decision:     run.decision     || '',
      confidence:   run.confidence   ?? 0,
      riskRating:   run.riskRating   || '',
      addedAt:      new Date().toISOString(),
    };

    // Optimistic update
    const optimistic = { id: 'temp-' + Date.now(), ...doc, addedAt: doc.addedAt };
    setItems(prev => [optimistic, ...prev]);

    try {
      const created = await databases.createDocument(DB_ID, WATCHLIST_COL, ID.unique(), doc);
      setItems(prev => prev.map(i => i.id === optimistic.id ? docToItem(created) : i));
    } catch (err) {
      console.error('[Watchlist] add error:', err);
      setItems(prev => prev.filter(i => i.id !== optimistic.id)); // rollback
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
    ticker:      doc.ticker      || null,
    decision:    doc.decision    || null,
    confidence:  doc.confidence  ?? null,
    riskRating:  doc.riskRating  || null,
    addedAt:     doc.addedAt,
  };
}
