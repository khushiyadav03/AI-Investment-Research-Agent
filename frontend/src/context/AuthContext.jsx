import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { account, ID } from '../lib/appwrite';

const AuthContext = createContext(null);

/**
 * Wrap the app with <AuthProvider> to expose auth state everywhere.
 *
 * Exposed via useAuth():
 *   currentUser  — Appwrite User object or null
 *   loading      — true while the initial session check is in flight
 *   authError    — last auth error message string or null
 *   login(email, password)
 *   signup(email, password, name)
 *   logout()
 *   clearAuthError()
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);   // true until first session check resolves
  const [authError, setAuthError]     = useState(null);

  // On mount — check for existing session
  useEffect(() => {
    account.get()
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      const msg = parseAppwriteError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const signup = useCallback(async (email, password, name) => {
    setAuthError(null);
    try {
      await account.create(ID.unique(), email, password, name);
      // Auto-login after signup
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      const msg = parseAppwriteError(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current');
    } catch {
      // Ignore — session may already be expired
    } finally {
      setCurrentUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, authError, login, signup, logout, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Map Appwrite error codes to human-readable messages ─────
function parseAppwriteError(err) {
  const code = err?.code;
  const type = err?.type;
  if (type === 'user_already_exists' || code === 409)
    return 'An account with this email already exists. Try logging in instead.';
  if (type === 'user_invalid_credentials' || code === 401)
    return 'Incorrect email or password. Please try again.';
  if (type === 'user_not_found' || code === 404)
    return 'No account found with this email.';
  if (type === 'general_rate_limit_exceeded' || code === 429)
    return 'Too many attempts. Please wait a moment and try again.';
  if (err?.message?.includes('network'))
    return 'Network error — check your connection and try again.';
  return err?.message || 'Something went wrong. Please try again.';
}
