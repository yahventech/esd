// EASD Component — Fixtures
// Upcoming matches grid, mirroring the MatchResults collapsed-peek pattern so
// the section stays visually quiet until a reader actively expands it. Matches
// are bucketed by competition so editors and fans can scan the relevant
// round-by-round schedule without skimming a mixed flat list.

import { useState } from 'react';
import { CalendarClock, ChevronDown, Clock, MapPin } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MatchDetailModal } from './LiveScores';

function TeamLine({ team }) {
  return (
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
      <span className="font-body text-sm font-medium text-white truncate">{team.name}</span>
    </div>
  );
}

function FixtureCard({ match, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(match)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(match);
        }
      }}
      className="rounded-xl p-4 border border-white/[0.05] bg-navy-100/40 hover:border-gold/20 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
          {match.competition}
        </span>
        {match.kickoff_date && (
          <span className="font-display text-[10px] uppercase tracking-wider text-gold/70 truncate">
            {match.kickoff_date}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end mb-3">
        <span className="font-mono text-[11px] text-gold/80 flex items-center gap-1">
          <Clock size={10} /> {match.kickoff || 'TBD'}
        </span>
      </div>
      <div className="space-y-2">
        <TeamLine team={match.home} />
        <div className="flex items-center gap-2 my-1">
          <span className="h-px flex-1 bg-white/[0.06]" />
          <span className="font-display text-[10px] uppercase tracking-wider text-gray-600">vs</span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>
        <TeamLine team={match.away} />
      </div>
      {match.venue && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center gap-1.5 text-[10px] text-gray-500 font-body">
          <MapPin size={10} /> {match.venue}
        </div>
      )}
    </div>
  );
}

export default function Fixtures() {
  const [ref, visible] = useScrollAnimation();
  const { matches } = useAppData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fixtures = matches.filter((m) => m.status === 'UPCOMING');
  if (!fixtures.length) return null;

  // Group upcoming kickoffs by competition so the expanded view reads as a
  // round-by-round schedule rather than one long flat list.
  const grouped = (() => {
    const order = [];
    const buckets = {};
    for (const m of fixtures) {
      const key = (m.competition || '').trim() || 'Other Fixtures';
      if (!(key in buckets)) { buckets[key] = []; order.push(key); }
      buckets[key].push(m);
    }
    return order.map((name) => ({ name, matches: buckets[name] }));
  })();

  // Tiny teaser stack rendered behind a fade gradient when collapsed.
  const PEEK_COUNT = 3;
  const peek = fixtures.slice(0, PEEK_COUNT);

  return (
    <section className="relative py-10 sm:py-14 bg-gradient-to-b from-navy via-charcoal/40 to-navy" id="fixtures">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group w-full flex items-center justify-between mb-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
              <CalendarClock size={20} className="text-gold" />
              <span className="text-white">Fixtures</span>
            </h2>
            <span className="font-display text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
              {fixtures.length} Upcoming
            </span>
          </div>
          <span className="flex items-center gap-2 font-display text-[12px] uppercase tracking-wider text-gold/70 group-hover:text-gold transition-colors">
            <span className="hidden sm:inline">{open ? 'Hide' : 'View all'}</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {open ? (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-gold/60" />
                  <h3 className="font-display text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.15em] text-white">
                    {g.name}
                  </h3>
                  <span className="font-display text-[10px] uppercase tracking-wider text-gray-500">
                    {g.matches.length} {g.matches.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.matches.map((m) => (
                    <FixtureCard key={m.id} match={m} onOpen={setSelected} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Collapsed teaser — same fade pattern as Results so the two sit as
          // visual twins on the homepage flow.
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Show all ${fixtures.length} fixtures`}
            className="relative block w-full text-left"
          >
            <div className="relative max-h-32 overflow-hidden rounded-xl">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-50">
                {peek.map((m) => (
                  <div
                    key={m.id}
                    className="pointer-events-none rounded-xl p-4 border border-white/[0.05] bg-navy-100/40"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
                        {m.competition}
                      </span>
                      <span className="font-mono text-[11px] text-gold/60 flex items-center gap-1">
                        <Clock size={10} /> {m.kickoff || 'TBD'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-navy/40 to-navy" />
            </div>
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gold/30 bg-gold/[0.04] group-hover:bg-gold/10 transition-colors font-display text-[12px] uppercase tracking-wider text-gold">
                Show all {fixtures.length} fixtures
                <ChevronDown size={14} />
              </span>
            </div>
          </button>
        )}
      </div>
      {selected && <MatchDetailModal match={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
