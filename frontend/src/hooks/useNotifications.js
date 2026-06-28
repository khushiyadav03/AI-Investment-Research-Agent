import { useState, useEffect, useCallback } from 'react';
import { databases, ID, Query, DB_ID, NOTIFICATIONS_COL } from '../lib/appwrite';

/**
 * useNotifications — Appwrite Database-backed notifications hook.
 *
 * Collection attributes required:
 *   userId (string), type (string), title (string),
 *   message (string), read (boolean), timestamp (datetime)
 *
 * Falls back to seed data when Appwrite env vars are not yet configured.
 */

const SEED = [
  { $id: 's1', id: 's1', type: 'notification', title: 'Welcome to InsideInvest!',   message: 'Search any public or private company to generate your first AI investment report.', read: false, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { $id: 's2', id: 's2', type: 'notification', title: 'New Feature: Watchlist',      message: 'You can now save companies to your watchlist from any research report.',             read: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
  { $id: 's3', id: 's3', type: 'message',      title: 'System',                      message: 'Your research pipeline is online and ready. Backend is connected on port 3001.',     read: false, timestamp: new Date(Date.now() - 1800000).toISOString() },
];

const isConfigured = () =>
  Boolean(import.meta.env.VITE_APPWRITE_PROJECT_ID && DB_ID && NOTIFICATIONS_COL);

export function useNotifications(userId) {
  const [allItems, setAllItems] = useState(SEED);

  const notifications       = allItems.filter(n => n.type === 'notification');
  const messages            = allItems.filter(n => n.type === 'message');
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages      = messages.filter(n => !n.read).length;

  // ── FETCH from Appwrite ──────────────────────────────────────
  useEffect(() => {
    if (!userId || !isConfigured()) return;
    // Note: only query on indexed attributes that exist in your collection schema.
    // Removed orderDesc('timestamp') — add the index in Appwrite console if needed.
    databases.listDocuments(DB_ID, NOTIFICATIONS_COL, [
      Query.equal('userId', userId),
      Query.limit(50),
    ])
    .then(res => {
      if (res.documents.length > 0) {
        // Sort client-side by $createdAt (always available) descending
        const sorted = res.documents
          .slice()
          .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        setAllItems(sorted.map(docToItem));
      }
    })
    .catch(err => console.error('[Notifications] fetch error:', err?.message));
  }, [userId]);

  // ── MARK ONE READ ────────────────────────────────────────────
  const markNotificationRead = useCallback((id) => {
    setAllItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isConfigured() || id.startsWith('s') || id.startsWith('local-')) return;
    databases.updateDocument(DB_ID, NOTIFICATIONS_COL, id, { read: true })
      .catch(err => console.error('[Notifications] markRead error:', err?.message));
  }, []);

  const markMessageRead = useCallback((id) => {
    setAllItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isConfigured() || id.startsWith('s') || id.startsWith('local-')) return;
    databases.updateDocument(DB_ID, NOTIFICATIONS_COL, id, { read: true })
      .catch(err => console.error('[Notifications] markRead error:', err?.message));
  }, []);

  // ── MARK ALL READ ────────────────────────────────────────────
  const markAllRead = useCallback(async (type) => {
    const toMark = allItems.filter(n => n.type === type && !n.read);
    setAllItems(prev => prev.map(n => n.type === type ? { ...n, read: true } : n));
    if (!isConfigured()) return;
    await Promise.all(
      toMark
        .filter(n => !n.id.startsWith('s') && !n.id.startsWith('local-'))
        .map(n => databases.updateDocument(DB_ID, NOTIFICATIONS_COL, n.id, { read: true })
          .catch(err => console.error('[Notifications] markAllRead error:', err?.message))
        )
    );
  }, [allItems]);

  const markAllNotificationsRead = useCallback(() => markAllRead('notification'), [markAllRead]);
  const markAllMessagesRead      = useCallback(() => markAllRead('message'),      [markAllRead]);

  // ── PUSH NEW (after research completes) ─────────────────────
  const pushResearchComplete = useCallback(async (companyName, decision) => {
    const localId = 'local-' + Date.now();
    const item = {
      $id: localId, id: localId,
      type: 'notification',
      title: `Research complete: ${companyName}`,
      message: `AI recommendation: ${decision ?? 'N/A'}`,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setAllItems(prev => [item, ...prev]);

    if (!userId || !isConfigured()) return;
    try {
      const doc = await databases.createDocument(DB_ID, NOTIFICATIONS_COL, ID.unique(), {
        userId,
        type:    item.type,
        title:   item.title,
        message: item.message,
        read:    false,
        // Only include 'timestamp' if your collection schema has this attribute.
        // If you get a "Missing required attribute" error, remove this line.
        // timestamp: item.timestamp,
      });
      setAllItems(prev => prev.map(n => n.id === localId ? docToItem(doc) : n));
    } catch (err) {
      console.error('[Notifications] push error:', err?.message);
    }
  }, [userId]);

  return {
    notifications, messages,
    unreadNotifications, unreadMessages,
    markNotificationRead, markAllNotificationsRead,
    markMessageRead, markAllMessagesRead,
    pushResearchComplete,
  };
}

function docToItem(doc) {
  return {
    $id: doc.$id, id: doc.$id,
    type: doc.type, title: doc.title,
    message: doc.message, read: doc.read,
    // Use custom 'timestamp' field if it exists, otherwise fall back to Appwrite's built-in $createdAt
    timestamp: doc.timestamp || doc.$createdAt,
  };
}
