import { useState, useEffect, useCallback } from 'react';
import { databases, ID, Query, DB_ID, WATCHLIST_COL } from '../lib/appwrite';

/**
 * useWatchlist — Appwrite Database-backed watchlist hook.
 *
 * Exact collection schema (from Appwrite console):
 *   userId      (string, required)
 *   symbol      (string, required)   ← ticker
 *   companyName (string, required)
 *   addedAt     (datetime, required)
 */
export function useWatchlist(userId) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    setLoading(true);
    try {
      const res = await databases.listDocuments(DB_ID, WATCHLIST_COL, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]);
      const sorted = res.documents
        .slice()
        .sort((a, b) => new Date(b.addedAt || b.$createdAt) - new Date(a.addedAt || a.$createdAt));
      setItems(sorted.map(docToItem));
    } catch (err) {
      if (err?.code === 401) {
        console.warn('[Watchlist] 401 — set collection permissions in Appwrite Console (Users: read/create/update/delete).');
      } else {
        console.error('[Watchlist] fetch error:', err?.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = useCallback(async (run) => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    if (items.some(i => i.companyName === run.companyName)) return;

    const now = new Date().toISOString();

    // Only send the fields that exist in the schema
    const doc = {
      userId,
      symbol:      run.ticker      || '',
      companyName: run.companyName,
      addedAt:     now,
    };

    const optimistic = {
      id: 'temp-' + Date.now(),
      companyName: run.companyName,
      ticker:      run.ticker      || null,
      decision:    run.decision    || null,
      confidence:  run.confidence  ?? null,
      riskRating:  run.riskRating  || null,
      addedAt:     now,
    };
    setItems(prev => [optimistic, ...prev]);

    try {
      const created = await databases.createDocument(DB_ID, WATCHLIST_COL, ID.unique(), doc);
      setItems(prev => prev.map(i => i.id === optimistic.id ? docToItem(created, run) : i));
    } catch (err) {
      console.error('[Watchlist] add error:', err?.message);
      setItems(prev => prev.filter(i => i.id !== optimistic.id));
    }
  }, [userId, items]);

  const removeItem = useCallback(async (companyName) => {
    if (!userId || !DB_ID || !WATCHLIST_COL) return;
    const target = items.find(i => i.companyName === companyName);
    if (!target) return;

    setItems(prev => prev.filter(i => i.companyName !== companyName));

    try {
      await databases.deleteDocument(DB_ID, WATCHLIST_COL, target.$id || target.id);
    } catch (err) {
      console.error('[Watchlist] remove error:', err?.message);
      fetchItems();
    }
  }, [userId, items, fetchItems]);

  const isWatched = useCallback((companyName) => {
    return items.some(i => i.companyName === companyName);
  }, [items]);

  return { items, loading, addItem, removeItem, isWatched };
}

/**
 * Map Appwrite doc to local item.
 * The schema only stores userId/symbol/companyName/addedAt —
 * decision/confidence/riskRating are passed via the `run` param on add
 * and stored in local state only (not persisted to DB).
 */
function docToItem(doc, run = {}) {
  return {
    $id:         doc.$id,
    id:          doc.$id,
    companyName: doc.companyName,
    ticker:      doc.symbol      || null,
    decision:    run.decision    || null,
    confidence:  run.confidence  ?? null,
    riskRating:  run.riskRating  || null,
    addedAt:     doc.addedAt     || doc.$createdAt || null,
  };
}
