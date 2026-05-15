// EASD Component — LiveScores
// Horizontal scoreboard strip — data streamed live from the Django Channels websocket.
// Clicking a card opens a detail modal with the structured event timeline.

import { ChevronLeft, ChevronRight, X, Clock, MapPin, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { api } from '../lib/api';

function MatchCard({ match, onOpen }) {
  const isLive = match.status === 'LIVE' || match.status === 'HT';
  const isFT = match.status === 'FT';
  const isUpcoming = match.status === 'UPCOMING';

  return (
    <div
      className={`flex-shrink-0 w-[260px] sm:w-[280px] rounded-xl p-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer border ${
        isLive
          ? 'border-emerald/20 hover:border-gold/30 bg-navy-100/80'
          : 'border-white/[0.05] hover:border-gold/20 bg-navy-100/50'
      }`}
      onClick={() => onOpen(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(match);
        }
      }}
    >
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500 via-emerald to-red-500" />
      )}

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
              {match.status === 'HT' ? 'HT' : (match.minute || 'LIVE')}
            </span>
          </div>
        ) : isFT ? (
          <span className="font-display text-[10px] font-bold text-gray-400 uppercase tracking-wider">FT</span>
        ) : (
          <span className="font-mono text-[11px] text-gold/60">{match.kickoff}</span>
        )}
      </div>

      <div className="space-y-2.5">
        <TeamRow
          team={match.home}
          isWinning={(match.home.score ?? -1) > (match.away.score ?? -1)}
          isLive={isLive}
          isUpcoming={isUpcoming}
        />
        <TeamRow
          team={match.away}
          isWinning={(match.away.score ?? -1) > (match.home.score ?? -1)}
          isLive={isLive}
          isUpcoming={isUpcoming}
        />
      </div>

      {match.events?.length > 0 && (
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
        {team.logo ? (
          <img src={team.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0 bg-white/5" />
        ) : team.flag ? (
          <span className="text-lg flex-shrink-0">{team.flag}</span>
        ) : (
          <span className="w-5 h-5 rounded bg-gold/10 text-gold flex items-center justify-center text-[9px] font-display font-bold uppercase flex-shrink-0">
            {(team.short_name || team.name || '?').slice(0, 3)}
          </span>
        )}
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
        {team.score !== null && team.score !== undefined ? team.score : '-'}
      </span>
    </div>
  );
}

function TeamCrest({ team, size = 'lg' }) {
  const dim = size === 'lg' ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-10 h-10';
  const initials = (team.short_name || team.name || '?').slice(0, 3);
  if (team.logo) {
    return <img src={team.logo} alt="" className={`${dim} rounded-xl object-cover bg-white/5 ring-1 ring-white/10`} />;
  }
  if (team.flag) {
    return <span className={`${dim} flex items-center justify-center text-4xl`}>{team.flag}</span>;
  }
  return (
    <span className={`${dim} rounded-xl bg-gold/10 text-gold flex items-center justify-center font-display font-bold uppercase ring-1 ring-gold/20`}>
      {initials}
    </span>
  );
}

const EVENT_ICON = {
  GOAL: '⚽', YELLOW: '🟨', RED: '🟥', SUB: '🔄', PEN: '⚽', OG: '🥅', INFO: 'ℹ️',
};

export function MatchDetailModal({ match: initialMatch, onClose }) {
  const { matches } = useAppData();
  const live = matches.find((m) => m.id === initialMatch.id) || initialMatch;
  const [events, setEvents] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingEvents(true);
    api.scores.events(live.id)
      .then((rows) => { if (alive) setEvents(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (alive) setEvents([]); })
      .finally(() => { if (alive) setLoadingEvents(false); });
    return () => { alive = false; };
  }, [live.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isLive = live.status === 'LIVE' || live.status === 'HT';
  const isFT = live.status === 'FT';
  const isUpcoming = live.status === 'UPCOMING';
  const homeScore = live.home.score ?? (isUpcoming ? null : 0);
  const awayScore = live.away.score ?? (isUpcoming ? null : 0);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-navy border border-white/10 sm:rounded-2xl shadow-2xl shadow-black/60 my-0 sm:my-8 min-h-screen sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-emerald to-red-500 sm:rounded-t-2xl" />
        )}

        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-navy/95 backdrop-blur-xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-gold/70 truncate">
              {live.competition}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald tracking-wider">
                    {live.status === 'HT' ? 'HALF TIME' : (live.minute || 'LIVE')}
                  </span>
                </>
              ) : isFT ? (
                <span className="font-display text-xs font-bold text-gray-400 uppercase tracking-wider">Full Time</span>
              ) : (
                <span className="font-mono text-xs text-gold/70 flex items-center gap-1.5">
                  <Clock size={12} /> {live.kickoff || 'TBD'}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-center text-center gap-3 min-w-0">
              <TeamCrest team={live.home} />
              <div className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-wide truncate w-full">
                {live.home.name}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className={`font-display text-4xl sm:text-6xl font-bold tabular-nums ${isUpcoming ? 'text-gray-600' : (homeScore ?? 0) > (awayScore ?? 0) ? 'text-gold' : 'text-white'}`}>
                {homeScore ?? '-'}
              </span>
              <span className="text-gray-600 font-display text-2xl sm:text-4xl">:</span>
              <span className={`font-display text-4xl sm:text-6xl font-bold tabular-nums ${isUpcoming ? 'text-gray-600' : (awayScore ?? 0) > (homeScore ?? 0) ? 'text-gold' : 'text-white'}`}>
                {awayScore ?? '-'}
              </span>
            </div>

            <div className="flex flex-col items-center text-center gap-3 min-w-0">
              <TeamCrest team={live.away} />
              <div className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-wide truncate w-full">
                {live.away.name}
              </div>
            </div>
          </div>

          {live.venue && (
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-500 font-body">
              <MapPin size={12} /> {live.venue}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-8 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Timeline</h4>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-gold/60" />
            </div>
          ) : events && events.length > 0 ? (
            <ul className="space-y-2">
              {events.map((ev) => (
                <EventRow key={ev.id} event={ev} homeTeamId={live.home?.id} />
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-gray-500 font-body py-6">
              {isUpcoming ? 'Match has not started yet.' : 'No events recorded.'}
            </p>
          )}

          {live.external_source && (
            <p className="mt-6 text-center text-[10px] text-gray-600 font-body uppercase tracking-wider">
              Auto-synced from {live.external_source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }) {
  const icon = EVENT_ICON[event.event_type] || '•';
  return (
    <li className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-colors">
      <span className="font-mono text-xs font-bold text-gold/80 w-10 text-right tabular-nums flex-shrink-0">
        {event.minute}'
      </span>
      <span className="text-lg flex-shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-body text-sm text-white truncate">
          {event.player}
          {event.detail && <span className="text-gray-500 font-normal ml-2 text-xs">{event.detail}</span>}
        </div>
      </div>
    </li>
  );
}

// Group a list of matches by their competition label, preserving the original
// ordering inside each group. Empty/unknown competition names fall into an
// "Other" bucket so the section is never silently dropped.
function groupMatchesByCompetition(rows) {
  const order = [];
  const buckets = {};
  for (const m of rows) {
    const key = (m.competition || '').trim() || 'Other Fixtures';
    if (!(key in buckets)) { buckets[key] = []; order.push(key); }
    buckets[key].push(m);
  }
  return order.map((name) => ({ name, matches: buckets[name] }));
}

function CompetitionStrip({ name, matches, onOpen }) {
  const scrollRef = useRef(null);
  const liveCount = matches.filter((m) => m.status === 'LIVE' || m.status === 'HT').length;
  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-gold/60 shrink-0" />
          <h3 className="font-display text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em] text-white truncate">
            {name}
          </h3>
          <span className="font-display text-[10px] uppercase tracking-wider text-gray-500 shrink-0">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </span>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-live absolute h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              <span className="font-display text-[9px] font-bold text-red-400 uppercase tracking-wider">
                {liveCount} live
              </span>
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${name} left`}
            className="p-1 rounded-md border border-white/10 text-gray-500 hover:text-gold hover:border-gold/30 transition-all"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${name} right`}
            className="p-1 rounded-md border border-white/10 text-gray-500 hover:text-gold hover:border-gold/30 transition-all"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function LiveScores() {
  const [ref, visible] = useScrollAnimation();
  const { matches } = useAppData();
  const [selected, setSelected] = useState(null);
  // Hero scoreboard: only matches actually unfolding right now. Upcoming
  // kickoffs are surfaced separately by the Fixtures component so the two
  // editorial intents (now vs later) don't blur into a single mixed strip.
  const liveMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'HT');
  const liveCount = liveMatches.length;

  if (!liveMatches.length) return null;

  const grouped = groupMatchesByCompetition(liveMatches);

  return (
    <section className="relative py-10 sm:py-14 bg-navy">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
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
              <span className="font-display text-[10px] font-bold text-red-400 tracking-wider uppercase">
                {liveCount} Live
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {grouped.map((g) => (
            <CompetitionStrip key={g.name} name={g.name} matches={g.matches} onOpen={setSelected} />
          ))}
        </div>
      </div>

      {selected && (
        <MatchDetailModal match={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
