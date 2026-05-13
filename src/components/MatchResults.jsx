// EASD Component — MatchResults
// Grid of finished matches with final scores. Click a card to view the event timeline.

import { useState } from 'react';
import { Trophy, Clock, ChevronDown } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { MatchDetailModal } from './LiveScores';

function TeamLine({ team, isWinner, isDraw }) {
  const scoreColor = isDraw ? 'text-white' : isWinner ? 'text-gold' : 'text-gray-500';
  const nameColor = isDraw ? 'text-gray-200' : isWinner ? 'text-white' : 'text-gray-500';
  return (
    <div className="flex items-center justify-between gap-3">
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
        <span className={`font-body text-sm font-medium truncate ${nameColor}`}>
          {team.name}
        </span>
      </div>
      <span className={`font-display text-xl font-bold tabular-nums ${scoreColor}`}>
        {team.score ?? 0}
      </span>
    </div>
  );
}

function ResultCard({ match, onOpen }) {
  const home = match.home.score ?? 0;
  const away = match.away.score ?? 0;
  const homeWin = home > away;
  const awayWin = away > home;
  const isDraw = home === away;

  return (
    <div
      onClick={() => onOpen(match)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(match);
        }
      }}
      className="rounded-xl p-4 border border-white/[0.05] bg-navy-100/40 hover:border-gold/20 hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
          {match.competition}
        </span>
        <span className="font-display text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5">
          FT
        </span>
      </div>
      <div className="space-y-2">
        <TeamLine team={match.home} isWinner={homeWin} isDraw={isDraw} />
        <TeamLine team={match.away} isWinner={awayWin} isDraw={isDraw} />
      </div>
      {match.kickoff && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center gap-1.5 text-[10px] text-gray-500 font-body">
          <Clock size={10} /> {match.kickoff}
        </div>
      )}
    </div>
  );
}

export default function MatchResults() {
  const [ref, visible] = useScrollAnimation();
  const { matches } = useAppData();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const results = matches.filter((m) => m.status === 'FT');
  if (!results.length) return null;

  // Collapsed dropdown shows a small teaser row of results behind a heavy fade;
  // expanding reveals the full grid at full opacity.
  const PEEK_COUNT = 3;
  const peek = results.slice(0, PEEK_COUNT);

  return (
    <section className="relative py-10 sm:py-14 bg-gradient-to-b from-navy to-charcoal/60">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Heading row doubles as the dropdown toggle. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group w-full flex items-center justify-between mb-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-gold to-emerald" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
              <Trophy size={20} className="text-gold" />
              <span className="text-white">Results</span>
            </h2>
            <span className="font-display text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
              {results.length} Final
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
          // Expanded — full grid, full opacity.
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((m) => (
              <ResultCard key={m.id} match={m} onOpen={setSelected} />
            ))}
          </div>
        ) : (
          // Collapsed — show a tiny peek heavily faded behind a gradient that
          // invites the click. Whole region is clickable to expand.
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Show all ${results.length} results`}
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
                      <span className="font-display text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5">
                        FT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-navy/40 to-navy" />
            </div>
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gold/30 bg-gold/[0.04] group-hover:bg-gold/10 transition-colors font-display text-[12px] uppercase tracking-wider text-gold">
                Show all {results.length} results
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
