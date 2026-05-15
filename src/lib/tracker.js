// EASD analytics tracker — keeps a stable per-browser session id in
// localStorage and POSTs page view / event beacons to /api/analytics/track/.
// We deliberately keep this dead simple: best-effort fire-and-forget, never
// blocks UX, never queues, and silently swallows network errors so the
// pixel never breaks the rest of the app.

import { api } from './api';

const SESSION_KEY = 'easd.analytics.session';

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionKey() {
  if (typeof localStorage === 'undefined') return '';
  let v = localStorage.getItem(SESSION_KEY);
  if (!v) {
    v = uuid();
    try { localStorage.setItem(SESSION_KEY, v); } catch { /* private mode */ }
  }
  return v;
}

// Map a route descriptor (from useRoute) onto the backend PageView.kind enum.
function routeKind(route) {
  switch (route?.type) {
    case 'home':       return 'home';
    case 'tag':        return 'tag';
    case 'gossip':     return 'gossip';
    case 'opinion':    return 'opinion';
    case 'transfers':  return 'transfers';
    case 'category':   return 'category';
    case 'section':    return 'section';
    default:           return 'other';
  }
}

export function trackPageView(route) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname + window.location.search;
  const session_key = getSessionKey();
  const body = {
    type: 'view',
    path,
    kind: routeKind(route),
    session_key,
    category_slug: route?.categorySlug || null,
  };
  // Fire-and-forget; never await.
  api.analytics.track(body).catch(() => { /* ignore */ });
}

export function trackEvent(eventType, opts = {}) {
  if (typeof window === 'undefined') return;
  const session_key = getSessionKey();
  const body = {
    type: 'event',
    event_type: eventType,
    target_type: opts.targetType || '',
    target_id: opts.targetId != null ? String(opts.targetId) : '',
    target_label: opts.targetLabel || '',
    session_key,
    metadata: opts.metadata || {},
  };
  api.analytics.track(body).catch(() => { /* ignore */ });
}
