// EASD Component — NewsFeedPage
// Auto-aggregated news feed: pulls every published story across all sport
// categories and groups them by category, so visitors get the full editorial
// picture on a single page without any manual curation. Each group is a
// horizontal-scroll rail of recent stories opening into the standard reader.

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, Newspaper } from 'lucide-react';
import { api } from '../lib/api';
import { useAppData } from '../context/AppDataContext';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import StoryReader from './StoryReader';

// How many stories we keep per category in the grouped view. Editors usually
// want the freshest few visible; the "See all" link still leads to the full
// sport page.
const GROUP_LIMIT = 8;

function StoryRailCard({ story, onOpen }) {
  const b = getCategoryBadge(story.category);
  const f = getFormatBadge(story.format);
  return (
    <button
      type="button"
      onClick={() => onOpen(story)}
      className="group shrink-0 w-[260px] sm:w-[300px] text-left rounded-xl overflow-hidden border border-white/[0.06] hover:border-gold/30 bg-navy-100/40 hover:bg-navy-100/60 transition-all flex flex-col"
    >
      <div className={`relative bg-gradient-to-br ${story.gradient || 'from-navy-200 via-navy-100 to-charcoal'}`}>
        {story.coverImage ? (
          <img src={story.coverImage} alt="" loading="lazy"
            className="block w-full max-h-[12rem] object-contain aspect-video" />
        ) : (
          <div className="w-full h-32" />
        )}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <span className={`absolute top-2.5 left-2.5 ${b.bg} px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
          {story.category}
        </span>
        {f && f.label !== 'News' && (
          <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.12em] border ${f.bg} ${f.text} ${f.border}`}>
            {f.label}
          </span>
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-display text-[14px] font-semibold leading-snug text-white group-hover:text-gold transition-colors line-clamp-3">
          {story.headline}
        </h3>
        {story.summary && (
          <p className="mt-1.5 text-[12px] text-gray-400 font-body leading-relaxed line-clamp-2">
            {story.summary}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center gap-2 text-[11px] text-gray-500 font-body">
          <span>{story.timestamp}</span>
          <span className="text-gray-700">·</span>
          <span>{story.readTime}</span>
        </div>
      </div>
    </button>
  );
}

export default function NewsFeedPage({ navigate }) {
  const { categories } = useAppData();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // null = all sports

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.stories.list('page_size=120&ordering=-published_at')
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        setStories(list);
      })
      .catch((e) => { if (alive) setError(e?.message || 'Failed to load news feed'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Group by category slug, preserving the AppData ordering of categories.
  const grouped = useMemo(() => {
    const byCat = new Map();
    for (const s of stories) {
      const slug = s.categorySlug || (s.category || '').toLowerCase();
      if (!slug) continue;
      if (!byCat.has(slug)) byCat.set(slug, []);
      byCat.get(slug).push(s);
    }
    const ordered = [];
    for (const cat of categories || []) {
      const rows = byCat.get(cat.slug);
      if (rows && rows.length) ordered.push({ cat, stories: rows.slice(0, GROUP_LIMIT) });
    }
    // Catch any stories whose category isn't in the categories list (e.g. archived sport).
    for (const [slug, rows] of byCat.entries()) {
      if (!ordered.find((g) => g.cat.slug === slug)) {
        ordered.push({
          cat: { slug, name: rows[0].category || slug, icon: '🗞' },
          stories: rows.slice(0, GROUP_LIMIT),
        });
      }
    }
    return ordered;
  }, [stories, categories]);

  const visibleGroups = activeFilter
    ? grouped.filter((g) => g.cat.slug === activeFilter)
    : grouped;

  return (
    <section className="relative pt-24 pb-16 bg-navy min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider">
            <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">News</span>
            <span className="text-white ml-2">Feed</span>
          </h1>
        </div>
        <p className="text-gray-400 font-body text-sm sm:text-base max-w-2xl mb-6 flex items-center gap-2">
          <Newspaper size={14} className="text-gold/70 shrink-0" />
          Every story across every sport, refreshed automatically and grouped by category.
        </p>

        {/* Sport filter chips — auto-derived from categories that actually have stories. */}
        {grouped.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all ${
                activeFilter === null
                  ? 'bg-gold/10 text-gold border-gold/40'
                  : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'
              }`}
            >
              All sports
            </button>
            {grouped.map(({ cat }) => {
              const isActive = activeFilter === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveFilter(isActive ? null : cat.slug)}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gold/10 text-gold border-gold/40'
                      : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={22} className="text-gold animate-spin" /></div>
        ) : error ? (
          <div className="py-10 text-center text-red-400 font-body">{error}</div>
        ) : visibleGroups.length === 0 ? (
          <p className="py-12 text-center text-gray-500 font-body italic">
            No stories published yet. The feed will fill up as editors hit publish.
          </p>
        ) : (
          <div className="space-y-10">
            {visibleGroups.map(({ cat, stories: rows }) => (
              <section key={cat.slug}>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => navigate?.(cat.slug)}
                    className="group inline-flex items-center gap-2"
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white group-hover:text-gold transition-colors">
                      {cat.name}
                    </h2>
                    <span className="font-mono text-[11px] text-gray-500 tabular-nums">{rows.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate?.(cat.slug)}
                    className="inline-flex items-center gap-1 font-display text-[11px] uppercase tracking-wider text-gold/70 hover:text-gold transition-colors"
                  >
                    See all <ChevronRight size={12} />
                  </button>
                </div>

                <div
                  className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {rows.map((s) => (
                    <StoryRailCard key={s.id} story={s} onOpen={setOpen} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {open && <StoryReader story={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
