// EASD Component — LiveScores
// ESPN "Scoreboard" strip — horizontally scrollable match cards with live indicators

import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useRef } from 'react';
import { liveScores } from '../data/scores';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { scrollToSection } from '../utils/helpers';

function MatchCard({ match }) {
  const isLive = match.status === 'LIVE';
  const isFT = match.status === 'FT';
  const isUpcoming = match.status === 'UPCOMING';

  return (
    <div
      className={`flex-shrink-0 w-[260px] sm:w-[280px] rounded-xl p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer border ${
        isLive
          ? 'border-emerald/20 hover:border-gold/30 bg-navy-100/80'
          : 'border-white/[0.05] hover:border-gold/20 bg-navy-100/50'
      }`}
      onClick={() => scrollToSection('highlights')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToSection('highlights');
        }
      }}
    >
      {/* Live top accent */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-emerald to-red-500" />
      )}

      {/* Competition + status header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
          {match.competition}
        </span>
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-live absolute h-full w-full rounded-full bg-emerald opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald" />
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald tracking-wider">
              {match.minute}
            </span>
          </div>
        ) : isFT ? (
          <span className="font-display text-[10px] font-bold text-gray-400 uppercase tracking-wider">FT</span>
        ) : (
          <span className="font-mono text-[11px] text-gold/60">{match.kickoff}</span>
        )}
      </div>

      {/* Teams + scores */}
      <div className="space-y-2.5">
        <TeamRow
          team={match.home}
          isWinning={match.home.score > match.away.score}
          isLive={isLive}
          isUpcoming={isUpcoming}
        />
        <TeamRow
          team={match.away}
          isWinning={match.away.score > match.home.score}
          isLive={isLive}
          isUpcoming={isUpcoming}
        />
      </div>

      {/* Events summary */}
      {match.events.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
          <p className="text-[10px] text-gray-500 font-body leading-relaxed line-clamp-1">
            {match.events.join(' · ')}
          </p>
        </div>
      )}
    </div>
  );
}

function TeamRow({ team, isWinning, isLive, isUpcoming }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg flex-shrink-0">{team.flag}</span>
        <span className={`font-body text-sm font-medium truncate ${isWinning ? 'text-white' : 'text-gray-400'}`}>
          {team.name}
        </span>
      </div>
      <span
        className={`font-display text-xl font-bold tabular-nums ${
          isUpcoming
            ? 'text-gray-600'
            : isWinning
              ? isLive ? 'text-gold' : 'text-white'
              : 'text-gray-500'
        }`}
      >
        {team.score !== null ? team.score : '-'}
      </span>
    </div>
  );
}

export default function LiveScores() {
  const [ref, visible] = useScrollAnimation();
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <section className="relative py-10 sm:py-14 bg-navy">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-red-500 to-gold" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
              <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Live</span>
              <span className="text-white ml-2">Scores</span>
            </h2>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="font-display text-[10px] font-bold text-red-400 tracking-wider uppercase">2 Live</span>
            </div>
          </div>

          {/* Scroll arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable scores strip */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`.scores-strip::-webkit-scrollbar { display: none; }`}</style>
          {liveScores.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </section>
  );
}
