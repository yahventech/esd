// EASD Component — SportCategories
// Horizontal sport selector pulling categories + filtered stories from the DRF backend.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { api } from '../lib/api';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import StoryReader from './StoryReader';

export default function SportCategories() {
  const [ref, visible] = useScrollAnimation();
  const { categories: feedCategories } = useAppData();
  const [categories, setCategories] = useState(feedCategories);
  const [active, setActive] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(feedCategories.length === 0);
  const [categoriesError, setCategoriesError] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setCategories(feedCategories);
    if (feedCategories.length) {
      setCategoriesLoading(false);
      setCategoriesError(null);
    }
  }, [feedCategories]);

  useEffect(() => {
    if (!active) { setArticles([]); return; }
    let alive = true;
    setLoading(true);
    api.categories.articles(active, 8)
      .then((list) => { if (alive) setArticles(list || []); })
      .catch(() => { if (alive) setArticles([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [active]);

  useEffect(() => {
    if (feedCategories.length || categories.length) return;

    let alive = true;
    setCategoriesLoading(true);
    setCategoriesError(null);

    api.categories.list()
      .then((list) => {
        if (!alive) return;
        const items = Array.isArray(list) ? list : (list?.results || []);
        setCategories(items);
      })
      .catch((err) => {
        if (!alive) return;
        setCategoriesError(err.message || 'Failed to load sports categories');
        setCategories([]);
      })
      .finally(() => {
        if (alive) setCategoriesLoading(false);
      });

    return () => { alive = false; };
  }, [feedCategories.length, categories.length]);

  return (
    <section className="relative py-10 sm:py-14 bg-charcoal">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
            <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Explore</span>
            <span className="text-white ml-2">Sports</span>
          </h2>
        </div>

        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categoriesLoading ? (
            <div className="flex items-center justify-center w-full py-6">
              <Loader2 size={20} className="text-gold animate-spin" />
            </div>
          ) : categories.length ? (
            categories.map((cat) => {
              const isActive = active === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setActive(isActive ? null : cat.slug)}
                  className={`flex-shrink-0 rounded-xl px-5 py-4 min-w-[130px] text-center transition-all duration-300 border ${
                    isActive
                      ? 'border-gold/40 -translate-y-1 shadow-lg shadow-gold/10'
                      : 'border-white/[0.06] hover:border-gold/20 hover:-translate-y-0.5'
                  }`}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}08)`
                      : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div className="text-3xl mb-2 transition-transform duration-300" style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
                    {cat.icon}
                  </div>
                  <div className={`font-display text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                    isActive ? 'text-gold' : 'text-gray-300'
                  }`}>
                    {cat.name}
                  </div>
                  <div className={`text-[11px] mt-1 font-body transition-colors ${
                    isActive ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {cat.count} articles
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-4 text-sm text-gray-400 italic">
              {categoriesError || 'No sports categories available at the moment.'}
            </div>
          )}
        </div>

        {/* Drill-down panel */}
        {active && (() => {
          const cat = categories.find((c) => c.slug === active);
          return (
            <div className="mt-6 rounded-xl border border-gold/10 bg-navy-100/40 overflow-hidden animate-fade-in">
              {cat && (cat.cover_url || cat.subtitle) && (
                <div
                  className="relative px-5 py-6 sm:px-8 sm:py-8 border-b border-white/[0.06]"
                  style={{
                    backgroundImage: cat.cover_url ? `linear-gradient(135deg, ${cat.color}aa 0%, ${cat.color}33 60%, rgba(15,31,58,0.95) 100%), url(${cat.cover_url})` : `linear-gradient(135deg, ${cat.color}33, ${cat.color}10)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">{cat.icon}</span>
                    <h3 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wider">{cat.name}</h3>
                  </div>
                  {cat.subtitle && (
                    <p className="text-gray-200 font-body text-sm sm:text-base max-w-2xl drop-shadow">{cat.subtitle}</p>
                  )}
                  <div className="mt-2 text-[11px] font-display uppercase tracking-wider text-white/70">
                    {cat.count} {cat.count === 1 ? 'article' : 'articles'}
                  </div>
                </div>
              )}
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="py-6 flex justify-center"><Loader2 size={20} className="text-gold animate-spin" /></div>
                ) : articles.length ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {articles.map((a) => {
                      const b = getCategoryBadge(a.category);
                      const f = getFormatBadge(a.format);
                      const tags = Array.isArray(a.tags) ? a.tags : [];
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setOpen(a)}
                          className="group text-left p-3 rounded-lg border border-white/[0.05] hover:border-gold/30 hover:bg-white/[0.02] transition-all"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`${b.text} font-display text-[10px] font-semibold uppercase tracking-[0.12em]`}>
                              {a.category}
                            </span>
                            {f && f.label !== 'News' && (
                              <span className={`font-display text-[9px] uppercase tracking-[0.12em] ${f.text}`}>
                                · {f.label}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-600">· {a.readTime}</span>
                          </div>
                          <div className="font-display text-[13px] font-semibold text-white group-hover:text-gold line-clamp-2">
                            {a.headline}
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
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm font-body italic">
                    No articles in this category yet. The newsroom is working on it.
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {open && <StoryReader story={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
