// EASD — Authentication context
// Exposes `user`, `login`, `register`, `logout`, and opens a login modal globally.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokens } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokens.user);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [adminOpen, setAdminOpen] = useState(false);

  // Re-validate the user on mount if we have tokens
  useEffect(() => {
    if (!tokens.access) return;
    api.auth.me().then(setUser).catch(() => { tokens.clear(); setUser(null); });
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.auth.login(username, password);
    tokens.set({ access: data.access, refresh: data.refresh, user: data.user });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.auth.register(payload);
    tokens.set({ access: data.access, refresh: data.refresh, user: data.user });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => { tokens.clear(); setUser(null); }, []);

  const openAuth = useCallback((tab = 'login') => {
    setAuthTab(tab); setAuthOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      user, login, register, logout,
      authOpen, setAuthOpen, authTab, setAuthTab, openAuth,
      adminOpen, setAdminOpen, openAdmin: () => setAdminOpen(true),
    }),
    [user, login, register, logout, authOpen, authTab, openAuth, adminOpen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
