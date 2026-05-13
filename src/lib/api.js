// EASD API Client
// Thin fetch wrapper around the Django REST Framework backend with automatic JWT refresh.

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'https://esd-biau.onrender.com/api/';

const TOKEN_KEY = 'easd.access';
const REFRESH_KEY = 'easd.refresh';
const USER_KEY = 'easd.user';

export const tokens = {
  get access() { return localStorage.getItem(TOKEN_KEY) || ''; },
  get refresh() { return localStorage.getItem(REFRESH_KEY) || ''; },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  },
  set({ access, refresh, user }) {
    if (access) localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function refreshAccess() {
  const refresh = tokens.refresh;
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) { tokens.clear(); return false; }
  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.access);
  if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
  return true;
}

async function request(path, { method = 'GET', body, auth = false, retry = true } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { Accept: 'application/json' };
  const isForm = body instanceof FormData;
  if (body != null && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccess();
    if (refreshed) return request(path, { method, body, auth, retry: false });
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

  if (!res.ok) {
    const err = new Error(
      (data && (data.detail || data.message)) || `${res.status} ${res.statusText}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// --- High-level API surface ---

export const api = {
  // Homepage feed (single round-trip that powers the landing page)
  feed: () => request('/api/feed/'),

  stories: {
    hero:        () => request('/api/stories/hero/'),
    featured:    () => request('/api/stories/featured/'),
    top:         (limit = 5) => request(`/api/stories/top/?limit=${limit}`),
    editorsPicks:() => request('/api/stories/editors-picks/'),
    breaking:    () => request('/api/stories/breaking/'),
    trending:    () => request('/api/stories/trending/'),
    list:        (params = '') => request(`/api/stories/${params ? `?${params}` : ''}`),
    detail:      (slug) => request(`/api/stories/${slug}/`),
    search:      (q) => request(`/api/stories/search/?q=${encodeURIComponent(q)}`),
    comments:    (slug) => request(`/api/stories/${slug}/comments/`),
    addComment:  (slug, body, parent = null) =>
      request(`/api/stories/${slug}/comments/`, {
        method: 'POST', auth: true, body: { body, parent },
      }),
    bookmarkToggle: (slug) =>
      request(`/api/stories/${slug}/bookmark/`, { method: 'POST', auth: true }),
    bookmarkStatus: (slug) =>
      request(`/api/stories/${slug}/bookmark/`, { auth: true }),
  },

  categories: {
    list: () => request('/api/categories/'),
    detail: (slug) => request(`/api/categories/${slug}/`),
    articles: (slug, limit = 20) => request(`/api/categories/${slug}/articles/?limit=${limit}`),
    sectionPage: (slug, sectionSlug, limit = 20) =>
      request(`/api/categories/${slug}/sections/${sectionSlug}/?limit=${limit}`),
  },

  scores: {
    list: () => request('/api/scores/'),
    live: () => request('/api/scores/live/'),
    detail: (id) => request(`/api/scores/${id}/`),
    events: (id) => request(`/api/scores/${id}/events/`),
  },

  teams: {
    list: (params = '') => request(`/api/scores/teams/${params ? `?${params}` : ''}`),
    detail: (slug) => request(`/api/scores/teams/${slug}/`),
    squad: (slug) => request(`/api/scores/teams/${slug}/squad/`),
    stats: (slug, params = '') => request(`/api/scores/teams/${slug}/stats/${params ? `?${params}` : ''}`),
  },

  players: {
    list: (params = '') => request(`/api/scores/players/${params ? `?${params}` : ''}`),
    detail: (slug) => request(`/api/scores/players/${slug}/`),
    stats: (slug, params = '') => request(`/api/scores/players/${slug}/stats/${params ? `?${params}` : ''}`),
  },

  seasons: { list: () => request('/api/scores/seasons/') },

  competitions: {
    list: (params = '') => request(`/api/scores/competitions/${params ? `?${params}` : ''}`),
  },

  stats: {
    leaders: (params = '') => request(`/api/scores/player-stats/leaders/${params ? `?${params}` : ''}`),
    teamRows: (params = '') => request(`/api/scores/team-stats/${params ? `?${params}` : ''}`),
    playerRows: (params = '') => request(`/api/scores/player-stats/${params ? `?${params}` : ''}`),
  },

  tags: {
    list: (q = '') => request(`/api/stories/tags/${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  },

  videos: {
    list: () => request('/api/videos/'),
    highlights: (limit = 6) => request(`/api/videos/highlights/?limit=${limit}`),
    detail: (slug) => request(`/api/videos/${slug}/`),
    play: (slug) => request(`/api/videos/${slug}/play/`, { method: 'POST' }),
  },

  newsletter: {
    subscribe: (email, extra = {}) =>
      request('/api/newsletter/subscribe/', {
        method: 'POST',
        body: { email, source: 'landing', ...extra },
      }),
    unsubscribe: (email) =>
      request('/api/newsletter/unsubscribe/', { method: 'POST', body: { email } }),
  },

  auth: {
    register: (payload) =>
      request('/api/auth/register/', { method: 'POST', body: payload }),
    login: (username, password) =>
      request('/api/auth/login/', { method: 'POST', body: { username, password } }),
    me: () => request('/api/auth/profile/', { auth: true }),
    updateProfile: (payload) =>
      request('/api/auth/profile/', { method: 'PATCH', auth: true, body: payload }),
    changePassword: (current_password, new_password) =>
      request('/api/auth/password/', {
        method: 'POST', auth: true, body: { current_password, new_password },
      }),
  },

  bookmarks: {
    mine: () => request('/api/bookmarks/mine/', { auth: true }),
  },

  comments: {
    like: (id) => request(`/api/comments/${id}/like/`, { method: 'POST', auth: true }),
  },

  admin: {
    stories: {
      list:   () => request('/api/stories/manage/', { auth: true }),
      mine:   () => request('/api/stories/mine/', { auth: true }),
      detail: (slug) => request(`/api/stories/${slug}/`, { auth: true }),
      create: (payload) => request('/api/stories/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/stories/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/stories/${slug}/`, { method: 'DELETE', auth: true }),
    },
    videos: {
      list:   () => request('/api/videos/', { auth: true }),
      create: (payload) => request('/api/videos/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/videos/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/videos/${slug}/`, { method: 'DELETE', auth: true }),
    },
    teams: {
      list:   (params = '') => request(`/api/scores/teams/${params ? `?${params}` : ''}`, { auth: true }),
      detail: (slug) => request(`/api/scores/teams/${slug}/`, { auth: true }),
      create: (payload) => request('/api/scores/teams/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/scores/teams/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/scores/teams/${slug}/`, { method: 'DELETE', auth: true }),
      squad:  (slug) => request(`/api/scores/teams/${slug}/squad/`, { auth: true }),
    },
    players: {
      list:   (params = '') => request(`/api/scores/players/${params ? `?${params}` : ''}`, { auth: true }),
      detail: (slug) => request(`/api/scores/players/${slug}/`, { auth: true }),
      create: (payload) => request('/api/scores/players/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/scores/players/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/scores/players/${slug}/`, { method: 'DELETE', auth: true }),
    },
    seasons: {
      list:   () => request('/api/scores/seasons/', { auth: true }),
      create: (payload) => request('/api/scores/seasons/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/scores/seasons/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/scores/seasons/${slug}/`, { method: 'DELETE', auth: true }),
    },
    competitions: {
      list:   () => request('/api/scores/competitions/', { auth: true }),
      create: (payload) => request('/api/scores/competitions/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/scores/competitions/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/scores/competitions/${slug}/`, { method: 'DELETE', auth: true }),
    },
    teamStats: {
      list:   (params = '') => request(`/api/scores/team-stats/${params ? `?${params}` : ''}`, { auth: true }),
      create: (payload) => request('/api/scores/team-stats/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/scores/team-stats/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/scores/team-stats/${id}/`, { method: 'DELETE', auth: true }),
      recalculate: (competitionId, seasonId) =>
        request('/api/scores/team-stats/recalculate/', {
          method: 'POST', auth: true,
          body: { competition: competitionId, season: seasonId },
        }),
    },
    playerStats: {
      list:   (params = '') => request(`/api/scores/player-stats/${params ? `?${params}` : ''}`, { auth: true }),
      create: (payload) => request('/api/scores/player-stats/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/scores/player-stats/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/scores/player-stats/${id}/`, { method: 'DELETE', auth: true }),
    },
    matches: {
      list:   () => request('/api/scores/', { auth: true }),
      detail: (id) => request(`/api/scores/${id}/`, { auth: true }),
      create: (payload) => request('/api/scores/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/scores/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/scores/${id}/`, { method: 'DELETE', auth: true }),
      events: (id) => request(`/api/scores/${id}/events/`, { auth: true }),
      addEvent: (id, payload) => request(`/api/scores/${id}/events/`, { method: 'POST', auth: true, body: payload }),
      removeEvent: (id) => request(`/api/scores/events/${id}/`, { method: 'DELETE', auth: true }),
      syncLive: () => request('/api/scores/sync-live/', { method: 'POST', auth: true }),
    },
    tags: {
      list:   (q = '') => request(`/api/stories/tags/${q ? `?q=${encodeURIComponent(q)}` : ''}`, { auth: true }),
      create: (payload) => request('/api/stories/tags/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/stories/tags/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/stories/tags/${slug}/`, { method: 'DELETE', auth: true }),
    },
    breaking: {
      list:   () => request('/api/stories/breaking-news/', { auth: true }),
      create: (payload) => request('/api/stories/breaking-news/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/stories/breaking-news/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/stories/breaking-news/${id}/`, { method: 'DELETE', auth: true }),
    },
    trending: {
      list:   () => request('/api/stories/trending/', { auth: true }),
      create: (payload) => request('/api/stories/trending/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/stories/trending/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/stories/trending/${id}/`, { method: 'DELETE', auth: true }),
    },
    categories: {
      list:   () => request('/api/categories/', { auth: true }),
      create: (payload) => request('/api/categories/', { method: 'POST', auth: true, body: payload }),
      update: (slug, payload) => request(`/api/categories/${slug}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (slug) => request(`/api/categories/${slug}/`, { method: 'DELETE', auth: true }),
    },
    sections: {
      list:   (categorySlug = '') => request(
        `/api/categories/sections/${categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ''}`,
        { auth: true },
      ),
      create: (payload) => request('/api/categories/sections/', { method: 'POST', auth: true, body: payload }),
      update: (id, payload) => request(`/api/categories/sections/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      remove: (id) => request(`/api/categories/sections/${id}/`, { method: 'DELETE', auth: true }),
    },
    users: {
      list:   () => request('/api/auth/users/', { auth: true }),
      update: (id, payload) => request(`/api/auth/users/${id}/`, { method: 'PATCH', auth: true, body: payload }),
      setRole: (id, role) => request(`/api/auth/users/${id}/set_role/`, { method: 'POST', auth: true, body: { role } }),
      remove: (id) => request(`/api/auth/users/${id}/`, { method: 'DELETE', auth: true }),
    },
  },
};

export function isStaffRole(user) {
  if (!user) return false;
  return ['admin', 'editor', 'author'].includes(user.role);
}

export function isEditor(user) {
  return Boolean(user && ['editor', 'admin'].includes(user.role));
}

export function isAdmin(user) {
  return Boolean(user && user.role === 'admin');
}

export const WS_URL = API_BASE.replace(/^http/, 'ws') + '/ws/scores/';

export function openScoresSocket(onMessage) {
  if (typeof window === 'undefined') return () => {};
  let ws;
  let closed = false;
  let retry;

  const connect = () => {
    ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      try { onMessage(JSON.parse(event.data)); }
      catch { /* ignore malformed frames */ }
    };
    ws.onclose = () => {
      if (closed) return;
      retry = setTimeout(connect, 2500);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
  };
  connect();

  return () => {
    closed = true;
    clearTimeout(retry);
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  };
}
