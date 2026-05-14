// EASD Hook — useRoute
// Lightweight hash-based router: parses `#/category/section` into a view state
// and exposes navigate(path) for clients. Falls back to 'home' when the hash
// is empty or unknown.

import { useCallback, useEffect, useState } from 'react';

// Reserved top-level paths that bypass the category/section parser.
// Each maps `#/<slug>` to a discrete route type the App can render directly.
// The trailing segment, if any, is interpreted as a sport-category filter.
const RESERVED_TOP_LEVEL = new Set(['gossip', 'opinion', 'news']);

function parse(hash) {
  const clean = (hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
  if (!clean) return { type: 'home' };
  const parts = clean.split('/').filter(Boolean).map(decodeURIComponent);
  // /tag/<slug> — dedicated hashtag page.
  if (parts[0] === 'tag') {
    return { type: 'tag', tagSlug: parts[1] || null };
  }
  if (RESERVED_TOP_LEVEL.has(parts[0])) {
    return { type: parts[0], sportSlug: parts[1] || null };
  }
  if (parts.length === 1) {
    return { type: 'category', categorySlug: parts[0] };
  }
  if (parts.length >= 2) {
    return { type: 'section', categorySlug: parts[0], sectionSlug: parts[1] };
  }
  return { type: 'home' };
}

export function useRoute() {
  const [route, setRoute] = useState(() =>
    typeof window === 'undefined' ? { type: 'home' } : parse(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((path) => {
    const target = path === '' || path === '/' ? '#/' : `#/${path.replace(/^\/+/, '').replace(/\/$/, '')}`;
    if (window.location.hash === target) {
      setRoute(parse(target));
    } else {
      window.location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return [route, navigate];
}
