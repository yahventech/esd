// EASD Hook — useRoute
// Path-based SPA router using the History API. Parses `/category/section`
// (and `/tag/<slug>`, `/gossip`, `/opinion`) into a view state, exposes
// `navigate(path)` for programmatic moves, and globally intercepts in-app
// link clicks so plain `<a href="/foo">` stays inside the SPA without forcing
// a full page reload. Falls back to 'home' when the path is empty.

import { useCallback, useEffect, useState } from 'react';

// Reserved top-level paths that bypass the category/section parser.
// Each maps `/<slug>` to a discrete route type the App can render directly.
// The trailing segment, if any, is interpreted as a sport-category filter.
const RESERVED_TOP_LEVEL = new Set(['gossip', 'opinion', 'transfers']);

function parse(pathname) {
  const clean = (pathname || '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return { type: 'home' };
  const parts = clean.split('/').filter(Boolean).map((seg) => {
    try { return decodeURIComponent(seg); } catch { return seg; }
  });
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

// Migrate legacy `/#/foo` URLs to `/foo` on first paint so bookmarks and
// shared links keep working after the switch off hash routing.
function upgradeHashUrl() {
  if (typeof window === 'undefined') return;
  const { hash } = window.location;
  if (hash && hash.startsWith('#/')) {
    const newPath = hash.slice(1) || '/';
    window.history.replaceState({}, '', newPath);
  }
}

upgradeHashUrl();

export function useRoute() {
  const [route, setRoute] = useState(() =>
    typeof window === 'undefined' ? { type: 'home' } : parse(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPopState);

    // Intercept clicks on in-app anchors so plain `<a href="/tag/x">` does an
    // SPA push instead of a hard page load. Modifier keys, middle/right
    // clicks, target=_blank, and external links all fall through to the
    // browser's default behaviour.
    const onLinkClick = (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a');
      if (!a) return;
      if (a.target && a.target !== '' && a.target !== '_self') return;
      const href = a.getAttribute('href');
      if (!href) return;
      // Only intercept relative / same-origin absolute paths.
      if (!href.startsWith('/') || href.startsWith('//')) return;
      if (a.origin && a.origin !== window.location.origin) return;
      e.preventDefault();
      if (a.pathname !== window.location.pathname || a.search !== window.location.search) {
        window.history.pushState({}, '', a.pathname + a.search);
      }
      setRoute(parse(a.pathname));
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    document.addEventListener('click', onLinkClick);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onLinkClick);
    };
  }, []);

  const navigate = useCallback((path) => {
    const target = path === '' || path === '/' ? '/' :
      `/${String(path).replace(/^\/+/, '').replace(/\/+$/, '')}`;
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(parse(target));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return [route, navigate];
}
