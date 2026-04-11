// EASD Component — FeaturedStories
// ESPN-style editorial content grid: featured 3-up + ranked top stories sidebar

import { Clock, MessageSquare, ChevronRight, BookOpen, Bookmark } from 'lucide-react';
import { featuredStories, topStories, editorsPicks } from '../data/stories';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { getCategoryBadge, scrollToSection } from '../utils/helpers';

function StoryCard({ story, size = 'normal' }) {
  const badge = getCategoryBadge(story.category);
  const isLarge = size === 'large';

  return (
    <article
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/[0.06] border border-white/[0.05] hover:border-gold/20 ${
        isLarge ? 'row-span-2' : ''
      }`}
      style={{ background: 'rgba(15,31,58,0.6)' }}
      onClick={() => scrollToSection('newsletter')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToSection('newsletter');
        }
      }}
    >
      {/* Image placeholder with gradient */}
      <div
        className={`relative ${isLarge ? 'h-56 sm:h-72' : 'h-40'} bg-gradient-to-br ${
          story.gradient || 'from-navy-200 via-navy-100 to-charcoal'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent pointer-events-none" />
        {/* Category badge floating */}
        <span className={`absolute top-3 left-3 ${badge.bg} px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
          {story.category}
        </span>
        {/* Bookmark */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToSection('newsletter');
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 text-gray-400 hover:text-gold opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Save ${story.headline}`}
        >
          <Bookmark size={14} />
        </button>
      </div>

      {/* Content */}
      <div className={`p-4 ${isLarge ? 'sm:p-5' : ''}`}>
        <h3 className={`font-display font-bold leading-tight text-white group-hover:text-gold transition-colors ${
          isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-[15px]'
        }`}>
          {story.headline}
        </h3>
        {isLarge && story.summary && (
          <p className="mt-2 text-[13px] text-gray-400 font-body leading-relaxed line-clamp-2">
            {story.summary}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-gray-500 font-body">
          <span className="flex items-center gap-1"><Clock size={11} /> {story.timestamp}</span>
          <span className="text-gray-700">·</span>
          <span>{story.readTime}</span>
          {story.commentCount && (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1"><MessageSquare size={11} /> {story.commentCount}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function RankedStory({ story, rank }) {
  const badge = getCategoryBadge(story.category);
  return (
    <article
      className="group flex items-start gap-3 py-3 cursor-pointer border-b border-white/[0.04] last:border-0"
      onClick={() => scrollToSection('newsletter')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToSection('newsletter');
        }
      }}
    >
      {/* Rank number */}
      <span className="flex-shrink-0 font-display text-2xl font-bold text-gold/20 group-hover:text-gold/40 transition-colors w-7 text-right leading-none pt-0.5">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`${badge.text} font-display text-[10px] font-semibold uppercase tracking-[0.12em]`}>
            {story.category}
          </span>
        </div>
        <h4 className="font-display text-[13px] sm:text-sm font-semibold leading-snug text-gray-200 group-hover:text-gold transition-colors line-clamp-2">
          {story.headline}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-600">
          <span>{story.timestamp}</span>
          {story.commentCount && (
            <>
              <span className="text-gray-700">·</span>
              <span className="flex items-center gap-1"><MessageSquare size={10} /> {story.commentCount}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FeaturedStories() {
  const [ref, visible] = useScrollAnimation();

  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-b from-navy via-charcoal/50 to-navy">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-gold to-emerald" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
              <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Top</span>
              <span className="text-white ml-2">Stories</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('top-stories')}
            className="hidden sm:flex items-center gap-1 font-display text-[12px] uppercase tracking-wider text-gold/70 hover:text-gold transition-colors"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>

        {/* ESPN-style grid: stories left, ranked list right */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Featured stories grid — 8 cols */}
          <div className="lg:col-span-8">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* First story spans 2 rows on sm+ */}
              <StoryCard story={featuredStories[0]} size="large" />
              {featuredStories.slice(1).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>

          {/* Right sidebar — ranked top stories + editor's picks */}
          <div className="lg:col-span-4 space-y-6">
            {/* Top Stories ranked list */}
            <div className="rounded-xl bg-navy-100/50 border border-white/[0.05] p-4">
              <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-gold mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-gold/10 flex items-center justify-center">
                  <TrendingIcon />
                </span>
                Top Stories
              </h3>
              <div>
                {topStories.map((story, i) => (
                  <RankedStory key={story.id} story={story} rank={i + 1} />
                ))}
              </div>
            </div>

            {/* Editor's Picks */}
            <div className="rounded-xl bg-navy-100/50 border border-white/[0.05] p-4">
              <h3 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald mb-3 flex items-center gap-2">
                <BookOpen size={14} />
                Editor's Picks
              </h3>
              <div className="space-y-3">
                {editorsPicks.map((pick) => {
                  const b = getCategoryBadge(pick.category);
                  return (
                    <article
                      key={pick.id}
                      className="group cursor-pointer"
                      onClick={() => scrollToSection('newsletter')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          scrollToSection('newsletter');
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${b.text} font-display text-[10px] font-semibold uppercase tracking-[0.12em]`}>
                          {pick.category}
                        </span>
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
          </div>
        </div>
      </div>
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
