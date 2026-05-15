// EASD Component — Navbar
// Sticky nav + live search that hits the DRF backend + user menu backed by JWT.

import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Menu, X, ChevronDown, ChevronRight, LogIn, LogOut, Loader2, Bookmark, Settings } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { api, isStaffRole } from '../lib/api';
import { scrollToSection } from '../utils/helpers';
import StoryReader from './StoryReader';

const moreLinks = [
  { label: 'Live Scores', sectionId: 'live-scores' },
  { label: 'Fixtures', sectionId: 'fixtures' },
  { label: 'Results', sectionId: 'results' },
  { label: 'Transfers', path: 'transfers' },
  { label: 'Explore Sports', sectionId: 'sports' },
  { label: 'Highlights', sectionId: 'highlights' },
  { label: 'Newsletter', sectionId: 'newsletter' },
];

// Three vertical columns in the Sports mega-menu, keyed by CategorySection.scope.
// Editors choose a section's scope in the admin (Local / International / General).
const SCOPE_GROUPS = [
  { scope: 'local',         title: 'Local',         hint: 'East African leagues, teams, and athletes.' },
  { scope: 'international', title: 'International', hint: 'Premier League, La Liga, NBA — global game.' },
  { scope: 'general',       title: 'General',       hint: 'Cross-cutting coverage for the whole sport.' },
];

// Bucket sections by their scope. Columns with zero items drop out so a
// section-light sport doesn't render a wall of empty headers.
function groupByScope(sections) {
  const buckets = SCOPE_GROUPS.map((g) => ({ ...g, items: [] }));
  for (const s of sections || []) {
    const idx = buckets.findIndex((b) => b.scope === (s.scope || 'general'));
    if (idx >= 0) buckets[idx].items.push(s);
    else buckets[buckets.length - 1].items.push(s);
  }
  return buckets.filter((b) => b.items.length);
}

export default function Navbar({ navigate, route }) {
  const { categories, featured, top, editorsPicks } = useAppData();
  const { user, logout, openAuth, openAdmin } = useAuth();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Mobile accordion state — only one category's sections panel is expanded at a time.
  const [mobileOpenCategory, setMobileOpenCategory] = useState(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  // openCategory drives the desktop mega-menu. Special value '__sports__' means
  // the unified Sports dropdown is open; any other value is a category slug
  // (kept for the mobile per-category accordion).
  const [openCategory, setOpenCategory] = useState(null);
  const [activeSport, setActiveSport] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openStory, setOpenStory] = useState(null);
  const [userMenu, setUserMenu] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const moreMenuRef = useRef(null);
  const categoryNavRef = useRef(null);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const hoverTimerRef = useRef(null);

  // Every nav-flagged sport gets a tile in the Sports mega-menu sidebar.
  // (Pre-redesign this was sliced to 5 because each sport had its own top-bar
  // button. Now they all live inside the single "Sports" dropdown.)
  const navCategories = categories.filter((c) => c.is_nav);
  const activeCategorySlug = route?.type === 'category' || route?.type === 'section'
    ? route.categorySlug
    : null;

  // Small delay before closing the hovered category so users can traverse the
  // gap between the trigger and the dropdown panel without it snapping shut.
  const hoverCategory = (slug) => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    setOpenCategory(slug);
  };
  const scheduleClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setOpenCategory(null), 180);
  };

  // Bucket all visible stories by their category slug so each mega-menu can
  // show a featured card + a "Latest" headline list for its own category. The
  // pool is keyed by both slug AND lowercased name because curated lists
  // sometimes echo back only the display name. This is the global fallback —
  // each sport also lazy-fetches its own article list below.
  const storiesByCategory = useMemo(() => {
    const pool = [...(featured || []), ...(top || []), ...(editorsPicks || [])];
    const map = {};
    const seen = new Set();
    for (const s of pool) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      const slug = (s.categorySlug || '').toLowerCase();
      const nameKey = (s.category || '').toLowerCase();
      if (slug) (map[slug] = map[slug] || []).push(s);
      if (nameKey && nameKey !== slug) (map[nameKey] = map[nameKey] || []).push(s);
    }
    return map;
  }, [featured, top, editorsPicks]);

  // Per-sport article cache. Keyed by slug → array. The mega-menu fetches the
  // active sport's actual articles via /api/categories/<slug>/articles/ so the
  // Headlines and Featured panels reflect the real feed for that sport,
  // independent of which sports happened to get placement-curated globally.
  const [sportArticles, setSportArticles] = useState({});

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      setMobileOpenCategory(null);
      setMobileMoreOpen(false);
    }
  }, [mobileOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setMoreOpen(false);
      if (categoryNavRef.current && !categoryNavRef.current.contains(event.target)) setOpenCategory(null);
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenu(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  // Debounced live search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.stories.search(searchQ.trim());
        setSearchResults(r || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ]);

  const openBookmarks = async () => {
    if (!user) { openAuth('login'); return; }
    setBookmarksOpen(true); setUserMenu(false);
    try { setBookmarks(await api.bookmarks.mine()); }
    catch { setBookmarks([]); }
  };

  const handleHomeClick = () => {
    setOpenCategory(null); setMoreOpen(false); setMobileOpen(false);
    navigate?.('');
    scrollToSection('home');
  };

  const handleCategoryClick = (cat) => {
    setOpenCategory(null); setMoreOpen(false); setMobileOpen(false);
    const first = (cat.sections || []).find((s) => s.is_active !== false);
    if (first) navigate?.(`${cat.slug}/${first.slug}`);
    else navigate?.(cat.slug);
  };

  const handleSectionClick = (cat, section) => {
    setOpenCategory(null); setMobileOpen(false);
    // Per spec: the "Players" kind is relabelled "Gossip" everywhere. To keep
    // the per-sport Gossip and the top-level Gossip page consistent, this link
    // jumps to /gossip/<sport> instead of opening a stub section page.
    if (section.kind === 'players') {
      navigate?.(`gossip/${cat.slug}`);
      return;
    }
    navigate?.(`${cat.slug}/${section.slug}`);
  };

  const handleMoreClick = (item) => {
    setMoreOpen(false); setMobileOpen(false);
    if (item.path) {
      navigate?.(item.path);
      return;
    }
    navigate?.('');
    setTimeout(() => scrollToSection(item.sectionId), 0);
  };

  const handleTopLevelRoute = (slug) => {
    setOpenCategory(null); setMoreOpen(false); setMobileOpen(false);
    navigate?.(slug);
  };

  // Sports tab highlights whenever we're inside any sport category/section.
  const sportsRouteActive = route?.type === 'category' || route?.type === 'section';
  const sportsMenuOpen = openCategory === '__sports__';

  // When opening the Sports mega-menu, default the active tab to the current
  // category if we're already inside one, otherwise the first nav category.
  useEffect(() => {
    if (!sportsMenuOpen) return;
    if (activeSport) return;
    const fallback = activeCategorySlug || navCategories[0]?.slug || null;
    if (fallback) setActiveSport(fallback);
  }, [sportsMenuOpen, activeSport, activeCategorySlug, navCategories]);

  // Lazy-load the active sport's articles whenever the user lands on a tab
  // we haven't fetched yet. Two fallback paths run in parallel — the dedicated
  // category-articles endpoint AND a generic stories filter — because in the
  // wild some sports surface stories through one and not the other (e.g. when
  // category linkage exists but pagination on /articles/ misbehaves, or vice
  // versa). Results are unioned and deduped by id so we always show whatever
  // is genuinely there for this sport.
  useEffect(() => {
    if (!activeSport) return;
    if (sportArticles[activeSport] !== undefined) return;
    let alive = true;
    setSportArticles((m) => ({ ...m, [activeSport]: null })); // mark in-flight

    const fromArticles = api.categories.articles(activeSport, 8)
      .then((res) => (Array.isArray(res) ? res : (res?.results || [])))
      .catch(() => []);
    const fromStories = api.stories.list(`category__slug=${encodeURIComponent(activeSport)}&page_size=8`)
      .then((res) => (Array.isArray(res) ? res : (res?.results || [])))
      .catch(() => []);

    Promise.all([fromArticles, fromStories])
      .then(([a, b]) => {
        if (!alive) return;
        const seen = new Set();
        const merged = [];
        for (const s of [...a, ...b]) {
          if (!s || s.id == null) continue;
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          merged.push(s);
        }
        // Newest first — articles endpoint already sorts that way, but mixing
        // sources can scramble the order, so re-sort on the client.
        merged.sort((x, y) => {
          const dx = Date.parse(x.published_at || x.created_at || 0) || 0;
          const dy = Date.parse(y.published_at || y.created_at || 0) || 0;
          return dy - dx;
        });
        setSportArticles((m) => ({ ...m, [activeSport]: merged.slice(0, 8) }));
      });

    return () => { alive = false; };
  }, [activeSport, sportArticles]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-navy/90 backdrop-blur-xl shadow-2xl shadow-black/30 border-b border-gold/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <button
              type="button"
              onClick={handleHomeClick}
              className="flex items-center group"
              aria-label="EASD home"
            >
              <img
                src="/easd-logo-light.svg"
                alt="EASD — East Africa Sports Desk"
                className="h-9 sm:h-11 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)] group-hover:scale-[1.02] transition-transform"
              />
            </button>

            <div className="hidden md:flex items-center h-full relative" ref={categoryNavRef}>
              <button
                type="button"
                onClick={handleHomeClick}
                className={`relative h-full px-4 lg:px-5 font-display text-[13px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  route?.type === 'home' ? 'text-gold' : 'text-gray-300 hover:text-white'
                }`}
              >
                Home
                {route?.type === 'home' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                )}
              </button>

              {/* Sports — unified mega-menu wrapping every sport category */}
              <div className="static h-full flex items-stretch"
                onMouseEnter={() => hoverCategory('__sports__')}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => setOpenCategory(sportsMenuOpen ? null : '__sports__')}
                  className={`relative h-full px-3 lg:px-4 font-display text-[13px] font-medium uppercase tracking-[0.1em] transition-colors flex items-center gap-1 ${
                    sportsRouteActive || sportsMenuOpen ? 'text-gold' : 'text-gray-300 hover:text-white'
                  }`}
                  aria-expanded={sportsMenuOpen}
                  aria-haspopup="menu"
                >
                  Sports
                  <ChevronDown size={11} className={`transition-transform ${sportsMenuOpen ? 'rotate-180' : ''}`} />
                  {(sportsRouteActive || sportsMenuOpen) && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                  )}
                </button>

                {sportsMenuOpen && (
                  <div
                    className="fixed left-0 right-0 z-[60] animate-fade-in top-14 sm:top-16"
                    onMouseEnter={() => hoverCategory('__sports__')}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="border-t border-gold/20 border-b border-white/10 bg-charcoal backdrop-blur-xl shadow-2xl shadow-black/60 max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
                      <div className="max-w-[1400px] mx-auto">
                        {navCategories.length === 0 ? (
                          <p className="py-10 text-center text-gray-500 font-body italic">
                            No sport categories yet — add some in the admin dashboard.
                          </p>
                        ) : (() => {
                          const cat = navCategories.find((c) => c.slug === activeSport) || navCategories[0];
                          // Show only sections the editor has added in the admin dashboard
                          // — no baked-in defaults — so the mega-menu reflects exactly
                          // what's been published, nothing more.
                          const adminSections = Array.isArray(cat.sections) ? cat.sections : [];
                          const groups = groupByScope(adminSections);
                          // Prefer the per-sport API fetch — it returns the most
                          // recent published stories for *this* sport. Fall back
                          // to the global placement pool if the fetch hasn't
                          // resolved yet (or returned nothing).
                          const fetched = sportArticles[cat.slug];
                          const fetchedReady = Array.isArray(fetched) && fetched.length > 0;
                          const fallback = storiesByCategory[cat.slug]
                            || storiesByCategory[(cat.name || '').toLowerCase()]
                            || [];
                          const catStories = fetchedReady ? fetched : fallback;
                          const isLoadingCat = fetched === null && fallback.length === 0;
                          const hero = catStories[0];
                          const latest = catStories.slice(1, 4);

                          return (
                            <div className="grid grid-cols-12">
                              {/* LEFT: sports sidebar — hover or focus switches the active sport. */}
                              <aside className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-white/[0.06] py-2">
                                <div className="px-4 pt-2 pb-2 font-display text-[10px] uppercase tracking-[0.18em] text-gold/60 hidden md:block">
                                  All sports
                                </div>
                                <div className="flex md:block overflow-x-auto md:overflow-visible">
                                  {navCategories.map((c) => {
                                    const isActive = c.slug === cat.slug;
                                    return (
                                      <button
                                        key={c.slug}
                                        type="button"
                                        onMouseEnter={() => setActiveSport(c.slug)}
                                        onFocus={() => setActiveSport(c.slug)}
                                        onClick={() => handleCategoryClick(c)}
                                        className={`group shrink-0 md:w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-l-2 ${
                                          isActive
                                            ? 'border-gold bg-gold/[0.06] text-gold'
                                            : 'border-transparent text-gray-300 hover:text-white hover:bg-white/[0.02]'
                                        }`}
                                      >
                                        <span className="text-xl shrink-0">{c.icon}</span>
                                        <div className="flex-1 min-w-0 hidden md:block">
                                          <div className="font-display text-[13px] uppercase tracking-wider truncate">{c.name}</div>
                                          <div className="text-[10px] font-body text-gray-500 mt-0.5">
                                            {c.count ?? 0} {c.count === 1 ? 'story' : 'stories'}
                                          </div>
                                        </div>
                                        <div className="md:hidden font-display text-[12px] uppercase tracking-wider">{c.name}</div>
                                        <ChevronRight size={12} className={`hidden md:block transition-opacity ${
                                          isActive ? 'opacity-100 text-gold' : 'opacity-0 group-hover:opacity-60'
                                        }`} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </aside>

                              {/* RIGHT: active sport's hub. */}
                              <section className="col-span-12 md:col-span-9 p-5 space-y-5">
                                {/* Sport hero strip */}
                                <div
                                  className="rounded-lg px-5 py-4 flex items-center justify-between gap-4 border border-white/[0.06]"
                                  style={{
                                    backgroundImage: cat.cover_url
                                      ? `linear-gradient(90deg, ${cat.color}cc 0%, ${cat.color}44 50%, rgba(15,31,58,0.85) 100%), url(${cat.cover_url})`
                                      : `linear-gradient(90deg, ${cat.color}55, ${cat.color}11)`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                  }}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-3xl">{cat.icon}</span>
                                    <div className="min-w-0">
                                      <div className="font-display text-xl text-white uppercase tracking-wider truncate">{cat.name}</div>
                                      {cat.subtitle && (
                                        <div className="text-[12px] font-body text-white/80 truncate">{cat.subtitle}</div>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCategoryClick(cat)}
                                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 hover:border-gold/40 text-[11px] font-display uppercase tracking-wider text-white"
                                  >
                                    Visit hub <ChevronRight size={13} />
                                  </button>
                                </div>

                                {/* ESPN-style horizontal sub-nav. Each scope (Local / International
                                    / General) gets its own labelled strip; empty scopes drop out. */}
                                <div className="space-y-2">
                                  {groups.map((g) => {
                                    // Hide the "General" label when it's the only scope — keeps the
                                    // common case (no editor scope splits yet) visually quiet.
                                    const showLabel = !(groups.length === 1 && g.scope === 'general');
                                    return (
                                      <div key={g.scope} className="flex items-center gap-3 flex-wrap">
                                        {showLabel && (
                                          <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-gold/70 w-20">
                                            {g.title}
                                          </span>
                                        )}
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {g.items.map((s) => {
                                            const secActive = route?.type === 'section'
                                              && route.categorySlug === cat.slug
                                              && route.sectionSlug === s.slug;
                                            // "Players" sections show as "Gossip" per spec; "Teams" keeps its name.
                                            const displayName = s.kind === 'players' ? 'Gossip' : s.name;
                                            return (
                                              <button
                                                key={`${g.scope}-${s.slug}`}
                                                type="button"
                                                onClick={() => handleSectionClick(cat, s)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all ${
                                                  secActive
                                                    ? 'border-gold/40 bg-gold/10 text-gold'
                                                    : 'border-white/[0.06] text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/[0.03]'
                                                }`}
                                              >
                                                {s.icon && <span className="text-[12px] opacity-80">{s.icon}</span>}
                                                {displayName}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Headlines + Featured card — the meat of the dropdown. ESPN puts the
                                    actual editorial content front and centre below the sub-nav. */}
                                <div className="grid grid-cols-12 gap-5 pt-3 border-t border-white/[0.04]">
                                  <div className="col-span-12 md:col-span-7">
                                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-3">
                                      {cat.name} headlines
                                    </div>
                                    {isLoadingCat ? (
                                      <div className="flex items-center justify-center py-6">
                                        <Loader2 size={16} className="animate-spin text-gold/60" />
                                      </div>
                                    ) : latest.length > 0 ? (
                                      <ul className="space-y-2.5">
                                        {[hero, ...latest].filter(Boolean).slice(0, 5).map((s) => (
                                          <li key={s.id}>
                                            <button
                                              type="button"
                                              onClick={() => { setOpenStory(s); setOpenCategory(null); }}
                                              className="group w-full text-left flex items-start gap-3"
                                            >
                                              <div className={`w-14 h-14 shrink-0 rounded bg-gradient-to-br ${s.gradient || 'from-navy-200 to-charcoal'} relative overflow-hidden`}>
                                                {s.coverImage && (
                                                  <img src={s.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                                )}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="font-display text-[13px] font-semibold text-gray-200 group-hover:text-gold leading-snug line-clamp-2 transition-colors">
                                                  {s.headline}
                                                </div>
                                                <div className="text-[10px] font-body text-gray-600 mt-0.5">
                                                  {s.timestamp}{s.readTime ? ` · ${s.readTime}` : ''}
                                                </div>
                                              </div>
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleCategoryClick(cat)}
                                        className="w-full rounded-lg border border-dashed border-white/10 p-6 text-center text-[12px] text-gray-500 hover:text-gold hover:border-gold/30 font-body transition-colors"
                                      >
                                        No {cat.name.toLowerCase()} stories yet — visit the hub →
                                      </button>
                                    )}
                                  </div>

                                  <div className="col-span-12 md:col-span-5">
                                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-3">
                                      Featured
                                    </div>
                                    {hero ? (
                                      <button
                                        type="button"
                                        onClick={() => { setOpenStory(hero); setOpenCategory(null); }}
                                        className="group text-left w-full rounded-lg overflow-hidden border border-white/[0.06] hover:border-gold/30 transition-all"
                                      >
                                        <div className={`relative h-32 bg-gradient-to-br ${hero.gradient || 'from-navy-200 to-charcoal'}`}>
                                          {hero.coverImage && (
                                            <img src={hero.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                          )}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                          <span className="absolute top-2 left-2 bg-gold/90 text-navy px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider rounded">
                                            {hero.category}
                                          </span>
                                        </div>
                                        <div className="p-3">
                                          <div className="font-display text-[13px] font-bold text-white group-hover:text-gold leading-snug line-clamp-2 transition-colors">
                                            {hero.headline}
                                          </div>
                                          <div className="mt-1 text-[10px] font-body text-gray-500">
                                            {hero.timestamp}{hero.readTime ? ` · ${hero.readTime}` : ''}
                                          </div>
                                        </div>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleCategoryClick(cat)}
                                        className="w-full h-full min-h-[180px] rounded-lg border border-dashed border-white/10 p-4 text-center text-[12px] text-gray-500 hover:text-gold hover:border-gold/30 font-body transition-colors flex items-center justify-center"
                                      >
                                        Visit the {cat.name} hub
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </section>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gossip — dedicated page */}
              <button
                type="button"
                onClick={() => handleTopLevelRoute('gossip')}
                className={`relative h-full px-4 lg:px-5 font-display text-[13px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  route?.type === 'gossip' ? 'text-gold' : 'text-gray-300 hover:text-white'
                }`}
              >
                Gossip
                {route?.type === 'gossip' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                )}
              </button>

              {/* Opinion — dedicated page */}
              <button
                type="button"
                onClick={() => handleTopLevelRoute('opinion')}
                className={`relative h-full px-4 lg:px-5 font-display text-[13px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  route?.type === 'opinion' ? 'text-gold' : 'text-gray-300 hover:text-white'
                }`}
              >
                Opinion
                {route?.type === 'opinion' && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                )}
              </button>

              <div className="relative h-full flex items-stretch" ref={moreMenuRef}>
                <button
                  type="button"
                  className="h-full px-3 lg:px-4 font-display text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                >
                  More <ChevronDown size={12} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreOpen && (
                  <div className="absolute top-full right-0 mt-0 w-52 rounded-xl border border-white/10 bg-charcoal/95 backdrop-blur-xl shadow-xl shadow-black/40 p-2 z-50">
                    {moreLinks.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleMoreClick(item)}
                        className="w-full text-left px-3 py-2.5 rounded-lg font-display text-[12px] uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <button
                  type="button"
                  onClick={() => setSearchOpen((s) => !s)}
                  className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  aria-label="Search stories"
                >
                  <Search size={18} />
                </button>
                {searchOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-charcoal/95 backdrop-blur-xl shadow-xl shadow-black/40 p-3 z-50">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10">
                      <Search size={14} className="text-gray-500" />
                      <input
                        autoFocus
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Search stories, teams, sports…"
                        className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-500 font-body"
                      />
                      {searching && <Loader2 size={12} className="animate-spin text-gold/60" />}
                    </div>
                    <div className="mt-2 max-h-80 overflow-y-auto">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setOpenStory(r); setSearchOpen(false); setSearchQ(''); }}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <div className="font-display text-[10px] uppercase tracking-wider text-gold/70 mb-0.5">
                            {r.category}
                          </div>
                          <div className="text-[13px] text-gray-200 line-clamp-2">{r.headline}</div>
                        </button>
                      ))}
                      {!searching && searchQ && !searchResults.length && (
                        <div className="px-3 py-4 text-center text-[12px] text-gray-500">No matches</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Auth / user menu */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenu((o) => !o)}
                    className="hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border border-gold/30 text-gold hover:border-gold hover:bg-gold/5 transition-all"
                  >
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-gold to-yellow-500 text-navy font-display text-[11px] font-bold flex items-center justify-center">
                      {(user.display_name || user.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-display text-[12px] uppercase tracking-wider">
                      {(user.display_name || user.username).split(' ')[0]}
                    </span>
                    <ChevronDown size={11} />
                  </button>

                  {userMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-charcoal/95 backdrop-blur-xl shadow-xl shadow-black/40 p-2 z-50">
                      <div className="px-3 py-2 border-b border-white/5 mb-1">
                        <div className="font-display text-[12px] text-white">{user.display_name || user.username}</div>
                        <div className="text-[11px] text-gray-500">{user.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={openBookmarks}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-[13px] text-gray-300 hover:text-white hover:bg-white/5"
                      >
                        <Bookmark size={14} /> Saved stories
                      </button>
                      {isStaffRole(user) && (
                        <button
                          type="button"
                          onClick={() => { openAdmin(); setUserMenu(false); }}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-[13px] text-gold hover:bg-gold/5"
                        >
                          <Settings size={14} /> Admin dashboard
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { logout(); setUserMenu(false); }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-[13px] text-gray-300 hover:text-white hover:bg-white/5"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/30 text-gold hover:bg-gold/5 hover:border-gold transition-all font-display text-[11px] uppercase tracking-wider"
                >
                  <LogIn size={13} /> Sign in
                </button>
              )}

              <button
                type="button"
                className="md:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'
          } bg-navy/95 backdrop-blur-xl border-t border-white/5`}
        >
          <div className="px-4 py-3 space-y-1 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleHomeClick}
              className={`block w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider rounded-lg transition-colors ${
                route?.type === 'home' ? 'text-gold bg-gold/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>

            {/* Mobile Sports group — per-sport collapsible dropdowns */}
            {navCategories.length > 0 && (
              <div className="px-3 pt-3 pb-1 font-display text-[11px] uppercase tracking-[0.18em] text-gold/70">
                Sports
              </div>
            )}
            {navCategories.map((cat) => {
              const isOpen = mobileOpenCategory === cat.slug;
              const sections = Array.isArray(cat.sections) ? cat.sections : [];
              const hasSections = sections.length > 0;
              return (
                <div key={cat.slug} className="border border-white/[0.04] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSections) {
                        setMobileOpenCategory((curr) => (curr === cat.slug ? null : cat.slug));
                      } else {
                        handleCategoryClick(cat);
                      }
                    }}
                    aria-expanded={isOpen}
                    className={`w-full flex items-center justify-between px-4 py-3 font-display text-sm uppercase tracking-wider transition-colors ${
                      activeCategorySlug === cat.slug ? 'text-gold bg-gold/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">{cat.icon}</span>{cat.name}
                    </span>
                    {hasSections && (
                      <ChevronDown
                        size={14}
                        className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>
                  {hasSections && isOpen && (
                    <div className="bg-black/20 border-t border-white/[0.04] py-1">
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className="block w-full text-left px-6 py-2 font-display text-[12px] uppercase tracking-wider text-gold/80 hover:text-gold hover:bg-white/5"
                      >
                        Visit {cat.name} hub →
                      </button>
                      {sections.map((s) => {
                        const displayName = s.kind === 'players' ? 'Gossip' : s.name;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSectionClick(cat, s)}
                            className="block w-full text-left px-6 py-2 font-display text-[12px] uppercase tracking-wider text-gray-400 hover:text-gold hover:bg-white/5"
                          >
                            {s.icon && <span className="mr-2">{s.icon}</span>}{displayName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => handleTopLevelRoute('gossip')}
              className={`block w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider rounded-lg transition-colors ${
                route?.type === 'gossip' ? 'text-gold bg-gold/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Gossip
            </button>
            <button
              type="button"
              onClick={() => handleTopLevelRoute('opinion')}
              className={`block w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider rounded-lg transition-colors ${
                route?.type === 'opinion' ? 'text-gold bg-gold/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Opinion
            </button>

            {/* More — collapsible group so the bottom links don't clutter the menu */}
            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setMobileMoreOpen((o) => !o)}
                aria-expanded={mobileMoreOpen}
                className="w-full flex items-center justify-between px-4 py-3 font-display text-sm uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span>More</span>
                <ChevronDown
                  size={14}
                  className={`text-gray-500 transition-transform ${mobileMoreOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileMoreOpen && (
                <div className="bg-black/20 border-t border-white/[0.04] py-1">
                  {moreLinks.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleMoreClick(item)}
                      className="block w-full text-left px-6 py-2 font-display text-[12px] uppercase tracking-wider text-gray-400 hover:text-gold hover:bg-white/5"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <>
                <button type="button" onClick={openBookmarks}
                  className="w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider text-gold hover:bg-gold/5 rounded-lg flex items-center gap-2">
                  <Bookmark size={14} /> Saved
                </button>
                {isStaffRole(user) && (
                  <button type="button" onClick={() => { openAdmin(); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider text-gold hover:bg-gold/5 rounded-lg flex items-center gap-2">
                    <Settings size={14} /> Admin
                  </button>
                )}
                <button type="button" onClick={logout}
                  className="w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider text-red-400 hover:bg-red-500/5 rounded-lg flex items-center gap-2">
                  <LogOut size={14} /> Sign out ({user.display_name || user.username})
                </button>
              </>
            ) : (
              <button type="button" onClick={() => openAuth('login')}
                className="w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider text-gold hover:bg-gold/5 rounded-lg flex items-center gap-2">
                <LogIn size={14} /> Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {openStory && <StoryReader story={openStory} onClose={() => setOpenStory(null)} />}

      {bookmarksOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setBookmarksOpen(false)}>
          <div className="bg-navy border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gold uppercase tracking-wider flex items-center gap-2">
                <Bookmark size={16} /> Saved stories
              </h3>
              <button type="button" onClick={() => setBookmarksOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5">
                <X size={18} />
              </button>
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-gray-500 text-sm font-body italic">No saved stories yet. Tap the bookmark icon on any article.</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((b) => (
                  <button key={b.id} type="button"
                    onClick={() => { setOpenStory(b); setBookmarksOpen(false); }}
                    className="w-full text-left p-3 rounded-lg border border-white/[0.05] hover:border-gold/30 hover:bg-white/[0.02] transition-all">
                    <div className="text-[10px] uppercase tracking-wider text-gold/70 font-display mb-0.5">{b.category}</div>
                    <div className="text-[13px] text-gray-200 line-clamp-2">{b.headline}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
