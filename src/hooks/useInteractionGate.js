// EASD Hook — useInteractionGate
// Counts unauthenticated "interactions" (story opens, bookmark/comment
// attempts) in localStorage. Once the user crosses the FREE_LIMIT, the gate
// closes and any subsequent interaction triggers the signup modal instead.
// Resets to zero once the user signs in.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'easd.interactions';
export const FREE_LIMIT = 3;

function readCount() {
  if (typeof window === 'undefined') return 0;
  const raw = Number(window.localStorage.getItem(STORAGE_KEY) || '0');
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

export function useInteractionGate() {
  const { user, openAuth } = useAuth();
  const [count, setCount] = useState(readCount);

  // Wipe the counter the moment the visitor signs in.
  useEffect(() => {
    if (!user) return;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
    setCount(0);
  }, [user]);

  // Returns true if the caller should proceed with the interaction, false if
  // the gate intercepted (signup modal was opened).
  const consume = useCallback(() => {
    if (user) return true;
    const next = readCount() + 1;
    if (next > FREE_LIMIT) {
      openAuth?.('signup');
      return false;
    }
    try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
    setCount(next);
    return true;
  }, [user, openAuth]);

  const remaining = user ? Infinity : Math.max(0, FREE_LIMIT - count);
  const exhausted = !user && count >= FREE_LIMIT;

  return { count, remaining, exhausted, consume };
}
