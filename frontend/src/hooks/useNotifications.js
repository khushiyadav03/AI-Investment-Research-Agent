import { useState, useCallback } from 'react';

const SEED_NOTIFICATIONS = [
  { id: 1, type: 'notification', title: 'Welcome to InsideInvest!', message: 'Search any public or private company to generate your first AI investment report.', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
  { id: 2, type: 'notification', title: 'New Feature: Watchlist', message: 'You can now save companies to your watchlist from any research report.', timestamp: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: 3, type: 'notification', title: 'Tip: Bypass Cache', message: 'Use "Fresh analysis" in the navbar to force a new research run even if a cached result exists.', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true },
];

const SEED_MESSAGES = [
  { id: 1, type: 'message', title: 'System', message: 'Your research pipeline is online and ready. Backend is connected on port 3001.', timestamp: new Date(Date.now() - 1800000).toISOString(), read: false },
  { id: 2, type: 'message', title: 'AI Agent', message: 'All LLM models (Gemini 2.5 Flash) are available. Rate-limit failover across 5 API keys is active.', timestamp: new Date(Date.now() - 3600000).toISOString(), read: true },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);
  const [messages, setMessages] = useState(SEED_MESSAGES);

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const unreadMessages      = messages.filter(m => !m.read).length;

  const markNotificationRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markMessageRead = useCallback((id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const markAllMessagesRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  /** Call this after a research run completes to push a real notification */
  const pushResearchComplete = useCallback((companyName, decision) => {
    const newN = {
      id: Date.now(),
      type: 'notification',
      title: `Research complete: ${companyName}`,
      message: `AI recommendation: ${decision ?? 'N/A'}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newN, ...prev]);
  }, []);

  return {
    notifications, messages,
    unreadNotifications, unreadMessages,
    markNotificationRead, markAllNotificationsRead,
    markMessageRead, markAllMessagesRead,
    pushResearchComplete,
  };
}
