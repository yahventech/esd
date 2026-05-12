// EASD — Global data context
// Loads the homepage feed in one shot and opens a scores WebSocket for live updates.
// Falls back to a 20s HTTP poll whenever at least one match is LIVE/HT, so the scoreboard
// keeps ticking even if the websocket drops or the backend can't reach external providers.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, openScoresSocket } from '../lib/api';

const AppDataContext = createContext(null);

const EMPTY = {
  hero: null,
  featured: [],
  top: [],
  editorsPicks: [],
  breakingNews: [],
  trending: [],
  categories: [],
  matches: [],
  videos: [],
};

export function AppDataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const feed = await api.feed();
      setData({ ...EMPTY, ...feed });
    } catch (e) {
      setError(e.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Live scores socket
  useEffect(() => {
    const close = openScoresSocket((msg) => {
      if (msg.type === 'snapshot' && Array.isArray(msg.matches)) {
        setData((d) => ({ ...d, matches: msg.matches }));
      } else if (msg.type === 'match_update' && msg.match) {
        setData((d) => {
          const idx = d.matches.findIndex((m) => m.id === msg.match.id);
          const next = [...d.matches];
          if (idx >= 0) next[idx] = msg.match;
          else next.push(msg.match);
          return { ...d, matches: next };
        });
      }
    });
    return close;
  }, []);

  // Polling fallback: any time a match is LIVE/HT, refresh the scoreboard every 20s.
  // The socket usually gets the update first; the poll is belt-and-braces.
  const hasLive = data.matches.some((m) => m.status === 'LIVE' || m.status === 'HT');
  const pausedRef = useRef(false);
  useEffect(() => {
    const handleVisibility = () => { pausedRef.current = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  useEffect(() => {
    if (!hasLive) return undefined;
    const tick = async () => {
      if (pausedRef.current) return;
      try {
        const rows = await api.scores.list();
        const next = Array.isArray(rows) ? rows : (rows?.results || []);
        setData((d) => ({ ...d, matches: next }));
      } catch { /* keep last good state */ }
    };
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [hasLive]);

  // Breaking news refresh — alerts auto-expire 60 min after creation (server
  // filter), so the ticker must re-fetch periodically to drop dead items
  // without a page reload.
  useEffect(() => {
    const tick = async () => {
      if (pausedRef.current) return;
      try {
        const items = await api.stories.breaking();
        setData((d) => ({ ...d, breakingNews: Array.isArray(items) ? items : [] }));
      } catch { /* keep last good state */ }
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(() => ({ ...data, loading, error, reload }), [data, loading, error, reload]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
