// EASD Component — FeaturedStories
// Editorial grid wired to the DRF backend. Bookmarks are live, clicks open a story modal.

import { useEffect, useState } from 'react';
import { Clock, MessageSquare, BookOpen, Bookmark as BookmarkIcon, Loader2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { api } from '../lib/api';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import StoryReader from './StoryReader';

function StoryCard({ story, size = 'normal', onOpen }) {
  const badge = getCategoryBadge(story.category);
  const fmt = getFormatBadge(story.format);
  const isLarge = size === 'large';
  const { user, openAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const tags = Array.isArray(story.tags) ? story.tags : [];

  const toggleBookmark = async (e) => {
    e.stopPropagation();
    if (!user) { openAuth('login'); return; }
    try {
      const res = await api.stories.bookmarkToggle(story.slug);
      setSaved(Boolean(res?.bookmarked));
    } catch { /* no-op */ }
  };

  return (
    <article
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/[0.06] border border-white/[0.05] hover:border-gold/20 flex flex-col"
      style={{ background: 'rgba(15,31,58,0.6)' }}
      onClick={() => onOpen(story)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(story);
        }
      }}
    >
      <div
        className={`relative flex-shrink-0 overflow-hidden bg-gradient-to-br ${
          story.gradient || 'from-navy-200 via-navy-100 to-charcoal'
        } ${isLarge ? 'aspect-[16/10]' : 'aspect-[16/9]'}`}
      >
        {story.coverImage ? (
          <img
            src={story.coverImage}
            alt=""
            // Fixed aspect ratio + object-cover so every card matches its
            // siblings. Editors can upload any source ratio without breaking
            // the homepage grid alignment.
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className={`${badge.bg} px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
            {story.category}
          </span>
          {fmt && fmt.label !== 'News' && (
            <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] font-semibold uppercase tracking-[0.12em] border ${fmt.bg} ${fmt.text} ${fmt.border}`}>
              {fmt.symbol && <span>{fmt.symbol}</span>}
              {fmt.label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleBookmark}
          className={`absolute top-3 right-3 p-1.5 rounded-full bg-black/30 transition-all ${
            saved ? 'text-gold opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gold'
          }`}
          aria-label={`Save ${story.headline}`}
        >
          <BookmarkIcon size={14} fill={saved ? '#FFD700' : 'none'} />
        </button>
      </div>

      <div className={`p-4 flex-1 flex flex-col ${isLarge ? 'sm:p-5' : ''}`}>
        <h3 className={`font-display font-bold leading-tight text-white group-hover:text-gold transition-colors ${
          isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-[15px]'
        }`}>
          {story.headline}
        </h3>
        {story.summary && (
          <p className={`mt-2 ${isLarge ? 'text-[13.5px]' : 'text-[12.5px]'} text-gray-400 font-body leading-relaxed line-clamp-3`}>
            {story.summary}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, isLarge ? 4 : 2).map((t) => (
              <a key={t.slug || t.name}
                href={`/tag/${encodeURIComponent((t.slug || t.name).toString().toLowerCase())}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-body text-gold/80 bg-gold/[0.06] border border-gold/15 hover:border-gold/40 hover:text-gold rounded-full px-2 py-0.5 transition-colors">
                #{t.name}
              </a>
            ))}
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-gray-500 font-body">
          <span className="flex items-center gap-1"><Clock size={11} /> {story.timestamp}</span>
          <span className="text-gray-700">·</span>
          <span>{story.readTime}</span>
          {story.commentCount ? (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1"><MessageSquare size={11} /> {story.commentCount}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RankedStory({ story, rank, onOpen }) {
  const badge = getCategoryBadge(story.category);
  const fmt = getFormatBadge(story.format);
  return (
    <article
      className="group flex items-start gap-3 py-3 cursor-pointer border-b border-white/[0.04] last:border-0"
      onClick={() => onOpen(story)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(story);
        }
      }}
    >
      <span className="flex-shrink-0 font-display text-2xl font-bold text-gold/20 group-hover:text-gold/40 transition-colors w-7 text-right leading-none pt-0.5">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`${badge.text} font-display text-[10px] font-semibold uppercase tracking-[0.12em]`}>
            {story.category}
          </span>
          {fmt && fmt.label !== 'News' && (
            <span className={`font-display text-[9px] uppercase tracking-[0.12em] ${fmt.text}`}>
              · {fmt.label}
            </span>
          )}
        </div>
        <h4 className="font-display text-[13px] sm:text-sm font-semibold leading-snug text-gray-200 group-hover:text-gold transition-colors line-clamp-2">
          {story.headline}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-600">
          <span>{story.timestamp}</span>
          {story.commentCount ? (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1"><MessageSquare size={10} /> {story.commentCount}</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function FeaturedStories() {
  const [ref, visible] = useScrollAnimation();
  const { top, editorsPicks, categories, loading } = useAppData();
  const [open, setOpen] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [allStories, setAllStories] = useState([]);
  const [allLoading, setAllLoading] = useState(true);
  const [filteredStories, setFilteredStories] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Load the most recent published stories for the main "Stories" grid. The
  // sidebar's curated Top Stories + Editor's Picks come from the feed payload
  // (`top`, `editorsPicks`) so we deliberately don't duplicate them here.
  useEffect(() => {
    let alive = true;
    setAllLoading(true);
    api.stories.list('page_size=24')
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        setAllStories(list);
      })
      .catch(() => { if (alive) setAllStories([]); })
      .finally(() => { if (alive) setAllLoading(false); });
    return () => { alive = false; };
  }, []);

  // When a sport is picked, fetch its published stories; clearing returns to
  // the all-stories grid above.
  useEffect(() => {
    if (!categoryFilter) { setFilteredStories([]); return; }
    let alive = true;
    setFilterLoading(true);
    api.categories.articles(categoryFilter, 24)
      .then((list) => { if (alive) setFilteredStories(list || []); })
      .catch(() => { if (alive) setFilteredStories([]); })
      .finally(() => { if (alive) setFilterLoading(false); });
    return () => { alive = false; };
  }, [categoryFilter]);

  if (loading) {
    return (
      <section className="relative py-20 text-center text-gray-500 font-body text-sm">
        Loading editorial content…
      </section>
    );
  }
  if (!allStories.length && !top.length && !editorsPicks.length && !allLoading) {
    return null;
  }

  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-b from-navy via-charcoal/50 to-navy">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-gold to-emerald" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
              {categoryFilter ? (
                <>
                  <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">
                    {categories.find((c) => c.slug === categoryFilter)?.name || 'Sport'}
                  </span>
                  <span className="text-white ml-2">Stories</span>
                </>
              ) : (
                <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">
                  Stories
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Sport-category filter chips — pick a sport to focus the feed. */}
        {categories && categories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-3 mb-5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all ${
                categoryFilter === null
                  ? 'bg-gold/10 text-gold border-gold/40'
                  : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'
              }`}
            >
              All sports
            </button>
            {categories.map((cat) => {
              const isActive = categoryFilter === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setCategoryFilter(isActive ? null : cat.slug)}
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

        {/* Filtered flat grid — only renders when a sport chip is active. */}
        {categoryFilter && (
          filterLoading ? (
            <div className="py-12 flex justify-center"><Loader2 size={20} className="text-gold animate-spin" /></div>
          ) : filteredStories.length === 0 ? (
            <p className="py-10 text-center text-gray-500 font-body italic">
              No stories in {(categories.find((c) => c.slug === categoryFilter)?.name) || 'this sport'} yet.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStories.map((s) => (
                <StoryCard key={s.id} story={s} onOpen={setOpen} />
              ))}
            </div>
          )
        )}

        {/* All-stories grid + curated sidebar — only when no sport filter is active. */}
        {!categoryFilter && (
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-9">
            {allLoading ? (
              <div className="py-12 flex justify-center"><Loader2 size={20} className="text-gold animate-spin" /></div>
            ) : allStories.length === 0 ? (
              <p className="py-10 text-center text-gray-500 font-body italic">No stories published yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allStories.map((story, i) => (
                  // Promote the most recent story to the large card spanning two
                  // columns so the grid keeps an editorial focal point without
                  // the cards growing unevenly tall.
                  <div key={story.id} className={i === 0 ? 'sm:col-span-2' : ''}>
                    <StoryCard
                      story={story}
                      size={i === 0 ? 'large' : 'normal'}
                      onOpen={setOpen}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`${allStories.length > 0 ? 'lg:col-span-3' : 'lg:col-span-12'} space-y-6`}>
            {top.length > 0 && (
            <div className="hidden md:block rounded-xl bg-navy-100/50 border border-white/[0.05] p-4">
              <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-gold mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-gold/10 flex items-center justify-center">
                  <TrendingIcon />
                </span>
                Top Stories
              </h3>
              <div>
                {top.map((story, i) => (
                  <RankedStory key={story.id} story={story} rank={i + 1} onOpen={setOpen} />
                ))}
              </div>
            </div>
            )}

            {editorsPicks.length > 0 && (
            <div className="rounded-xl bg-navy-100/50 border border-white/[0.05] p-4">
              <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald mb-3 flex items-center gap-2">
                <BookOpen size={14} />
                Editor's Picks
              </h3>
              <div className="space-y-3">
                {editorsPicks.map((pick) => {
                  const b = getCategoryBadge(pick.category);
                  const f = getFormatBadge(pick.format);
                  return (
                    <article
                      key={pick.id}
                      className="group cursor-pointer"
                      onClick={() => setOpen(pick)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpen(pick);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${b.text} font-display text-[10px] font-semibold uppercase tracking-[0.12em]`}>
                          {pick.category}
                        </span>
                        {f && f.label !== 'News' && (
                          <span className={`font-display text-[9px] uppercase tracking-[0.12em] ${f.text}`}>
                            · {f.label}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600">· {pick.readTime}</span>
                      </div>
                      <h4 className="font-display text-[13px] font-semibold leading-snug text-gray-300 group-hover:text-gold transition-colors">
                        {pick.headline}
                      </h4>
                    </article>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        </div>
        )}
      </div>

      {open && <StoryReader story={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function TrendingIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 8.5L4.5 5L6.5 7L11 2.5" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2.5H11V5.5" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
