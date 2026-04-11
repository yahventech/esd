// EASD Component — Hero
// ESPN-inspired immersive hero section with live match card overlay and editorial headline

import { ArrowRight, Play, Clock, MessageSquare, TrendingUp } from 'lucide-react';
import { heroStory, trendingTopics } from '../data/stories';
import { getCategoryBadge, scrollToSection } from '../utils/helpers';

export default function Hero() {
  const badge = getCategoryBadge(heroStory.category);

  return (
    <section className="relative min-h-[100svh] flex items-end overflow-hidden pt-24">
      {/* Layered background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Base gradient */}
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
        {/* Diagonal texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg, transparent, transparent 60px,
              rgba(255,215,0,1) 60px, rgba(255,215,0,1) 61px
            )`,
          }}
        />
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
        {/* Decorative orbs */}
        <div className="absolute top-[20%] right-[10%] w-80 h-80 rounded-full bg-gold/[0.03] blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-60 h-60 rounded-full bg-emerald/[0.04] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-end">
          {/* Main headline area — 8 cols */}
          <div className="lg:col-span-8 space-y-5">
            {/* Category + live tag */}
            <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <span className={`${badge.bg} px-2.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
                {heroStory.category}
              </span>
              {heroStory.isLive && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-display text-[11px] font-bold tracking-wider uppercase">Live Updates</span>
                </span>
              )}
            </div>

            {/* Headline */}
            <h1
              className="font-display text-[clamp(2rem,5.5vw,4.5rem)] font-bold leading-[0.92] tracking-tight animate-fade-in"
              style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
            >
              <span className="bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">
                Harambee Stars
              </span>
              <br />
              <span className="text-white">Clinch Historic</span>
              <br />
              <span className="text-white">AFCON Qualification</span>
            </h1>

            {/* Summary */}
            <p
              className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed font-body animate-fade-in"
              style={{ animationDelay: '0.35s', animationFillMode: 'both' }}
            >
              {heroStory.summary}
            </p>

            {/* CTAs */}
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

            {/* Meta row */}
            <div
              className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500 font-body animate-fade-in"
              style={{ animationDelay: '0.55s', animationFillMode: 'both' }}
            >
              <span>By <strong className="text-gray-300 font-semibold">{heroStory.author}</strong></span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {heroStory.timestamp}</span>
              <span className="text-gray-700">|</span>
              <span>{heroStory.readTime}</span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1"><MessageSquare size={13} /> {heroStory.commentCount}</span>
            </div>
          </div>

          {/* Right column — Live score card + trending */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live match card */}
            <div
              className="relative rounded-xl overflow-hidden animate-fade-in bg-navy-100/80 backdrop-blur-sm border border-white/[0.06]"
              style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
            >
              {/* Gold top accent */}
              <div className="h-[2px] bg-gradient-to-r from-gold via-emerald to-gold" />

              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500">
                    AFCON Qualifier
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/15 border border-red-500/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500" />
                      <span className="relative rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                    <span className="font-display text-[10px] font-bold text-red-400 tracking-wider">78'</span>
                  </div>
                </div>

                {/* Score display */}
                <div className="flex items-center justify-between">
                  <div className="text-center space-y-1 flex-1">
                    <div className="text-3xl">🇰🇪</div>
                    <div className="font-display text-sm font-semibold text-white">Kenya</div>
                  </div>
                  <div className="px-5 text-center">
                    <div className="font-display text-4xl sm:text-5xl font-bold bg-gradient-to-b from-gold to-yellow-500 bg-clip-text text-transparent leading-none">
                      2 – 1
                    </div>
                  </div>
                  <div className="text-center space-y-1 flex-1">
                    <div className="text-3xl">🇨🇲</div>
                    <div className="font-display text-sm font-semibold text-white">Cameroon</div>
                  </div>
                </div>

                {/* Events */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-gray-500 font-body space-y-1">
                  <div>⚽ Olunga 45', 89' · Aboubakar 67'</div>
                </div>
              </div>
            </div>

            {/* Trending topics — ESPN "Trending" sidebar */}
            <div
              className="rounded-xl bg-navy-100/60 backdrop-blur-sm border border-white/[0.06] p-4 animate-fade-in"
              style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-gold" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">
                  Trending Now
                </span>
              </div>
              <div className="space-y-2">
                {trendingTopics.map((t, i) => (
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
