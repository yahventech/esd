// EASD Component — VideoHighlights
// ESPN "Watch" section style — video thumbnails with play overlays and metadata

import { Play, Eye, Clock } from 'lucide-react';
import { videos } from '../data/scores';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { getCategoryBadge, scrollToSection } from '../utils/helpers';

export default function VideoHighlights() {
  const [ref, visible] = useScrollAnimation();

  return (
    <section className="relative py-12 sm:py-20 bg-gradient-to-b from-navy via-charcoal/30 to-navy">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-1 h-7 rounded-full bg-gradient-to-b from-gold to-red-500" />
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
            <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Latest</span>
            <span className="text-white ml-2">Highlights</span>
          </h2>
        </div>

        {/* Video grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => {
            const badge = getCategoryBadge(video.category);
            return (
              <article
                key={video.id}
                className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/[0.06] border border-white/[0.05] hover:border-gold/20"
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
                {/* Thumbnail */}
                <div className={`relative h-44 sm:h-48 bg-gradient-to-br ${video.gradient}`}>
                  {/* Darkened overlay on hover */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none" />

                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-gold to-yellow-500 shadow-lg shadow-gold/30 transition-all duration-300 group-hover:scale-110 group-hover:shadow-gold/50">
                      <Play size={22} fill="#0A1628" color="#0A1628" className="ml-0.5" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm">
                    <Clock size={10} className="text-gray-300" />
                    <span className="font-mono text-[11px] font-semibold text-white">{video.duration}</span>
                  </div>

                  {/* Category tag */}
                  <span className={`absolute top-3 left-3 ${badge.bg} px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-white rounded`}>
                    {video.category}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h4 className="font-display text-sm sm:text-[15px] font-semibold leading-snug text-white group-hover:text-gold transition-colors line-clamp-2">
                    {video.title}
                  </h4>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye size={11} /> {video.views} views
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
