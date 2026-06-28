import { Client, Account, Databases, ID, Query, Permission, Role } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account   = new Account(client);
export const databases = new Databases(client);

// Collection / Database IDs pulled from .env.local
export const DB_ID              = import.meta.env.VITE_APPWRITE_DATABASE_ID              || '';
export const WATCHLIST_COL      = import.meta.env.VITE_APPWRITE_WATCHLIST_COLLECTION_ID  || '';
export const NOTIFICATIONS_COL  = import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID || '';

// Re-export helpers so callers never import appwrite directly
export { ID, Query, Permission, Role };
