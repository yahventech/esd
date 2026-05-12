// EASD Component — StoryListPage
// Reusable filtered story feed page. Used by /gossip and /opinion to render a
// grid of stories filtered by `story_format`, with category-chip drill-down.

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { api } from '../lib/api';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import StoryReader from './StoryReader';

export default function StoryListPage({
  title,
  accent,                // tailwind text colour for the title accent word
  subtitle,
  filterParams,          // serialized query string, e.g. "story_format=opinion"
  initialCategorySlug,   // pre-select a sport chip on mount (e.g. from /gossip/<sport>)
  emptyMessage,
}) {
  const { categories } = useAppData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(initialCategorySlug || null);
  const [open, setOpen] = useState(null);

  const query = useMemo(() => {
    const parts = [filterParams, 'page_size=40'].filter(Boolean);
    if (activeCategory) parts.push(`category__slug=${encodeURIComponent(activeCategory)}`);
    return parts.join('&');
  }, [filterParams, activeCategory]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.stories.list(query)
      .then((res) => {
        if (!alive) return;
        // DRF paginates list endpoints; tolerate both shapes.
        const list = Array.isArray(res) ? res : (res?.results || []);
        setItems(list);
      })
      .catch((e) => { if (alive) setError(e?.message || 'Failed to load'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query]);

  return (
    <section className="relative pt-24 pb-16 bg-navy min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider">
            <span className={`bg-gradient-to-r ${accent || 'from-gold to-yellow-400'} bg-clip-text text-transparent`}>
              {title}
            </span>
          </h1>
        </div>
        {subtitle && (
          <p className="text-gray-400 font-body text-sm sm:text-base max-w-2xl mb-6">{subtitle}</p>
        )}

        {/* Category filter chips */}
        {categories && categories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-3 mb-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all ${
                activeCategory === null
                  ? 'bg-gold/10 text-gold border-gold/40'
                  : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'
              }`}
            >
              All sports
            </button>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setActiveCategory(isActive ? null : cat.slug)}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
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
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-gray-500 font-body italic">
            {emptyMessage || 'Nothing to show yet. Check back soon.'}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => {
              const b = getCategoryBadge(s.category);
              const f = getFormatBadge(s.format);
              const tags = Array.isArray(s.tags) ? s.tags : [];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpen(s)}
                  className="group text-left rounded-xl overflow-hidden border border-white/[0.06] hover:border-gold/30 hover:-translate-y-0.5 transition-all"
                  style={{ background: 'rgba(15,31,58,0.6)' }}
                >
                  <div
                    className={`relative h-40 bg-gradient-to-br ${s.gradient || 'from-navy-200 via-navy-100 to-charcoal'}`}
                  >
                    {s.coverImage && (
                      <img src={s.coverImage} alt="" loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`${b.bg} px-2 py-0.5 rounded font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-white`}>
                        {s.category}
                      </span>
                      {f && f.label !== 'News' && (
                        <span className={`px-2 py-0.5 rounded font-display text-[10px] font-semibold uppercase tracking-[0.12em] border ${f.bg} ${f.text} ${f.border}`}>
                          {f.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-display text-[15px] font-semibold text-white group-hover:text-gold leading-snug line-clamp-3 transition-colors">
                      {s.headline}
                    </div>
                    {s.summary && (
                      <div className="mt-1.5 text-[12px] text-gray-400 font-body line-clamp-2">{s.summary}</div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500 font-body">
                      <span>{s.timestamp}</span>
                      {s.readTime && <span>· {s.readTime}</span>}
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t) => (
                          <span key={t.slug || t.name}
                            className="text-[10px] font-body text-gold/80 bg-gold/[0.06] border border-gold/15 rounded-full px-2 py-0.5">
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {open && <StoryReader story={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
