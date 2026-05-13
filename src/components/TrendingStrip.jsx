// EASD Component — TrendingStrip
// Editorial trending-hashtag strip for the home body. Reads the same trending
// list the Hero sidebar uses but renders each topic as a clickable card with
// its body teaser, so visitors can jump straight into the dedicated #tag page.

import { TrendingUp, ChevronRight } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

function slugify(tag) {
  return (tag || '')
    .replace(/^#+/, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function teaser(body, maxLen = 140) {
  if (!body) return '';
  // Strip the bare-minimum markdown punctuation so the teaser reads cleanly.
  const flat = body
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  if (flat.length <= maxLen) return flat;
  const cut = flat.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : maxLen).trimEnd() + '…';
}

export default function TrendingStrip() {
  const [ref, visible] = useScrollAnimation();
  const { trending } = useAppData();
  if (!trending || trending.length === 0) return null;

  // Show up to 6 — keep the strip a strip, not a wall.
  const items = trending.slice(0, 6);

  return (
    <section className="relative py-12 sm:py-16 bg-navy">
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
              <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Trending</span>
              <span className="text-white ml-2">Now</span>
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-display uppercase tracking-wider text-gray-500">
            <TrendingUp size={12} className="text-gold/70" />
            Curated by the desk
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((t, i) => {
            const slug = t.slug || slugify(t.tag);
            const label = (t.tag || '').replace(/^#+/, '');
            const blurb = teaser(t.body);
            return (
              <a
                key={t.id || t.tag}
                href={`#/tag/${encodeURIComponent(slug)}`}
                className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-navy-100/40 hover:border-gold/40 hover:bg-navy-100/60 transition-all p-4 flex flex-col"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gold/[0.04] blur-2xl group-hover:bg-gold/[0.08] transition-colors" />
                <div className="flex items-center justify-between mb-1.5 relative">
                  <span className="font-mono text-[11px] text-gold/60 tabular-nums">#{String(i + 1).padStart(2, '0')}</span>
                  {t.category_name && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-display text-[9px] uppercase tracking-wider bg-emerald/10 text-emerald-300 border border-emerald-500/25">
                      {t.category_name}
                    </span>
                  )}
                </div>
                <div className="font-display text-base sm:text-lg font-bold text-white group-hover:text-gold transition-colors truncate relative">
                  <span className="text-gold/70 mr-0.5">#</span>{label}
                </div>
                {blurb ? (
                  <p className="mt-1 text-[12.5px] text-gray-400 font-body leading-relaxed line-clamp-3 relative">
                    {blurb}
                  </p>
                ) : (
                  <p className="mt-1 text-[12.5px] text-gray-600 font-body italic line-clamp-2 relative">
                    Tap to see every story filed under this hashtag.
                  </p>
                )}
                <div className="mt-auto pt-3 flex items-center justify-between relative">
                  <span className="text-[11px] text-gray-500 font-body">{t.count} posts</span>
                  <span className="inline-flex items-center gap-1 font-display text-[10px] uppercase tracking-wider text-gold/70 group-hover:text-gold transition-colors">
                    Read more <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
