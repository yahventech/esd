// EASD Component — Hero
// ESPN-inspired immersive hero section. Reads live data from the DRF backend via AppDataContext.

import { ArrowRight, Play, Clock, MessageSquare, TrendingUp, Loader2 } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { getCategoryBadge, getFormatBadge, scrollToSection } from '../utils/helpers';

function splitHeadline(headline) {
  const words = (headline || '').split(' ');
  if (words.length < 3) return [headline, '', ''];
  const third = Math.ceil(words.length / 3);
  return [
    words.slice(0, third).join(' '),
    words.slice(third, third * 2).join(' '),
    words.slice(third * 2).join(' '),
  ];
}

export default function Hero() {
  const { hero, trending, matches, loading } = useAppData();

  if (loading || !hero) {
    return (
      <section className="relative min-h-[70svh] flex items-center justify-center bg-navy">
        <Loader2 size={36} className="text-gold/60 animate-spin" />
      </section>
    );
  }

  const badge = getCategoryBadge(hero.category);
  const fmt = getFormatBadge(hero.format);
  const heroTags = Array.isArray(hero.tags) ? hero.tags : [];
  const [line1, line2, line3] = splitHeadline(hero.headline);
  const featuredMatch = matches.find((m) => m.is_featured && m.status === 'LIVE')
                     || matches.find((m) => m.status === 'LIVE')
                     || matches[0];

  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden pt-24">
      {/* Layered background */}
      <div className="absolute inset-0 pointer-events-none">
        {hero.coverImage && (
          <>
            <img
              src={hero.coverImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/40" />
          </>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 30% 40%, rgba(0,168,107,0.07) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(255,215,0,0.04) 0%, transparent 60%),
              radial-gradient(ellipse 50% 80% at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 70%),
              linear-gradient(170deg, #0A1628 0%, #0f1f3a 35%, #0d1a2f 65%, #0A1628 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg, transparent, transparent 60px,
              rgba(255,215,0,1) 60px, rgba(255,215,0,1) 61px
            )`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-[20%] right-[10%] w-80 h-80 rounded-full bg-gold/[0.03] blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-60 h-60 rounded-full bg-emerald/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-end">
          <div className="lg:col-span-8 space-y-5">
            <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <span className={`${badge.bg} px-2.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
                {hero.category}
              </span>
              {fmt && fmt.label !== 'News' && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.12em] border ${fmt.bg} ${fmt.text} ${fmt.border}`}>
                  {fmt.symbol && <span>{fmt.symbol}</span>}
                  {fmt.label}
                </span>
              )}
              {hero.isLive && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-display text-[11px] font-bold tracking-wider uppercase">Live Updates</span>
                </span>
              )}
            </div>

            <h1
              className="font-display text-[clamp(2rem,5.5vw,4.5rem)] font-bold leading-[0.92] tracking-tight animate-fade-in"
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              <span className="bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">
                {line1}
              </span>
              {line2 && (<><br /><span className="text-white">{line2}</span></>)}
              {line3 && (<><br /><span className="text-white">{line3}</span></>)}
            </h1>

            <p
              className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed font-body animate-fade-in"
              style={{ animationDelay: '0.35s', animationFillMode: 'both' }}
            >
              {hero.summary}
            </p>

            {heroTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 animate-fade-in"
                style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                {heroTags.slice(0, 6).map((t) => (
                  <span key={t.slug || t.name}
                    className="text-[11px] font-body text-gold/80 bg-gold/[0.06] border border-gold/20 rounded-full px-2.5 py-0.5">
                    #{t.name}
                  </span>
                ))}
              </div>
            )}

            <div
              className="flex flex-wrap items-center gap-3 pt-1 animate-fade-in"
              style={{ animationDelay: '0.45s', animationFillMode: 'both' }}
            >
              <button
                type="button"
                onClick={() => scrollToSection('top-stories')}
                className="group flex items-center gap-2.5 px-6 py-3 rounded-lg font-display text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-gold to-yellow-500 text-navy hover:shadow-lg hover:shadow-gold/20 transition-all hover:-translate-y-0.5"
              >
                Read Full Story
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('highlights')}
                className="group flex items-center gap-2.5 px-6 py-3 rounded-lg font-display text-sm font-semibold uppercase tracking-wider border-2 border-gold/60 text-gold hover:bg-gold/5 hover:border-gold transition-all"
              >
                <Play size={15} />
                Watch Highlights
              </button>
            </div>

            <div
              className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500 font-body animate-fade-in"
              style={{ animationDelay: '0.55s', animationFillMode: 'both' }}
            >
              <span>By <strong className="text-gray-300 font-semibold">{hero.author}</strong></span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {hero.timestamp}</span>
              <span className="text-gray-700">|</span>
              <span>{hero.readTime}</span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1"><MessageSquare size={13} /> {hero.commentCount}</span>
            </div>
          </div>

          {/* Right column — Live match card + trending */}
          <div className="lg:col-span-4 space-y-4">
            {featuredMatch && (
              <div
                className="relative rounded-xl overflow-hidden animate-fade-in bg-navy-100/80 backdrop-blur-sm border border-white/[0.06]"
                style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
              >
                <div className="h-[2px] bg-gradient-to-r from-gold via-emerald to-gold" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
                      {featuredMatch.competition}
                    </span>
                    {featuredMatch.status === 'LIVE' ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/15 border border-red-500/30">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500" />
                          <span className="relative rounded-full h-1.5 w-1.5 bg-red-500" />
                        </span>
                        <span className="font-display text-[10px] font-bold text-red-400 tracking-wider">{featuredMatch.minute}</span>
                      </div>
                    ) : (
                      <span className="font-display text-[10px] font-bold text-gray-400 uppercase">{featuredMatch.status}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-center space-y-1 flex-1">
                      <div className="text-3xl">{featuredMatch.home.flag}</div>
                      <div className="font-display text-sm font-semibold text-white">{featuredMatch.home.name}</div>
                    </div>
                    <div className="px-5 text-center">
                      <div className="font-display text-4xl sm:text-5xl font-bold bg-gradient-to-b from-gold to-yellow-500 bg-clip-text text-transparent leading-none">
                        {featuredMatch.home.score ?? '-'} – {featuredMatch.away.score ?? '-'}
                      </div>
                    </div>
                    <div className="text-center space-y-1 flex-1">
                      <div className="text-3xl">{featuredMatch.away.flag}</div>
                      <div className="font-display text-sm font-semibold text-white">{featuredMatch.away.name}</div>
                    </div>
                  </div>

                  {featuredMatch.events?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500 font-body space-y-1">
                      <div>{featuredMatch.events.slice(0, 3).join(' · ')}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              className="hidden lg:block rounded-xl bg-navy-100/60 backdrop-blur-sm border border-white/[0.06] p-4 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-gold" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">
                  Trending Now
                </span>
              </div>
              <div className="space-y-2">
                {trending.map((t, i) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => scrollToSection('top-stories')}
                    className="w-full flex items-center justify-between group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] text-gray-600 w-4">{i + 1}</span>
                      <span className="text-[13px] font-body font-medium text-gray-300 group-hover:text-gold transition-colors">
                        {t.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-600 font-body">{t.count} posts</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
