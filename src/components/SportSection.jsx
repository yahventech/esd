// EASD Component — SportSection
// Dedicated page for a category sub-section (e.g. /football/scores).
// Renders a layout appropriate for the section's `kind`: scores pulls live
// matches filtered by competition, standings/fixtures show match lists, and
// news/transfers/custom fall through to a story feed.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, Loader2, Trophy, ArrowUp, ArrowDown, Minus, Activity,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAppData } from '../context/AppDataContext';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import { MatchDetailModal } from './LiveScores';
import StoryReader from './StoryReader';

// TeamDetail pulls in PlayerDetail + the full stats UI — defer until a team
// card is actually opened.
const TeamDetail = lazy(() => import('./TeamDetail'));

function StoryTile({ story, onOpen }) {
  const b = getCategoryBadge(story.category);
  const f = getFormatBadge(story.format);
  const tags = Array.isArray(story.tags) ? story.tags : [];
  return (
    <button
      type="button"
      onClick={() => onOpen(story)}
      className="group text-left rounded-xl border border-white/[0.05] bg-navy-100/40 hover:border-gold/30 hover:bg-navy-100/60 overflow-hidden transition-all flex flex-col"
    >
      <div className={`relative bg-gradient-to-br ${story.gradient || 'from-navy-200 via-navy-100 to-charcoal'}`}>
        {story.coverImage ? (
          <img src={story.coverImage} alt="" loading="lazy"
            className="block w-full h-auto" />
        ) : (
          <div className="w-full h-40" />
        )}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <span className={`absolute top-3 left-3 ${b.bg} px-2 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
          {story.category}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1 text-[10px] text-gray-500 font-body">
          <span>{story.readTime}</span>
          {f && f.label !== 'News' && <span className={`${f.text} uppercase tracking-wider`}>· {f.label}</span>}
          <span>· {story.timestamp}</span>
        </div>
        <h3 className="font-display font-bold leading-tight text-white group-hover:text-gold transition-colors text-[15px] line-clamp-3">
          {story.headline}
        </h3>
        {story.summary && (
          <p className="mt-2 text-[12.5px] text-gray-400 font-body line-clamp-3">{story.summary}</p>
        )}
        {tags.length > 0 && (
          <div className="mt-auto pt-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <a key={t.slug || t.name}
                href={`/tag/${encodeURIComponent((t.slug || t.name).toString().toLowerCase())}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-body text-gold/80 bg-gold/[0.06] border border-gold/15 hover:border-gold/40 hover:text-gold rounded-full px-2 py-0.5 transition-colors">
                #{t.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function ScoresWithToggle({ categorySlug, onOpen }) {
  // The Scores subpage shows live matches by default but lets the user flip to
  // finished games (results) without leaving the page. Keeping both behind one
  // toggle prevents the menu from drifting toward a third subpage.
  const [mode, setMode] = useState('live');
  const tabBase = 'px-3 py-1.5 rounded-full text-[11px] font-display uppercase tracking-wider border transition-all inline-flex items-center gap-1.5';
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMode('live')}
          className={`${tabBase} ${mode === 'live'
            ? 'bg-red-500/10 text-red-300 border-red-500/40'
            : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className={`${mode === 'live' ? 'animate-pulse-live' : ''} absolute h-full w-full rounded-full bg-red-500`} />
            <span className="relative rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          Live
        </button>
        <button
          type="button"
          onClick={() => setMode('results')}
          className={`${tabBase} ${mode === 'results'
            ? 'bg-gold/10 text-gold border-gold/40'
            : 'text-gray-400 border-white/[0.06] hover:text-white hover:border-white/20'}`}
        >
          Results
        </button>
      </div>
      <MatchesPanel categorySlug={categorySlug} filter={mode} onOpen={onOpen} />
    </div>
  );
}


function MatchesPanel({ categorySlug, filter, onOpen }) {
  const { matches } = useAppData();

  const slice = useMemo(() => {
    const keyed = matches.filter((m) => {
      if (filter === 'live')    return m.status === 'LIVE' || m.status === 'HT';
      if (filter === 'results') return m.status === 'FT';
      if (filter === 'fixtures') return m.status === 'UPCOMING';
      return true;
    });
    const q = categorySlug.toLowerCase();
    const catMatch = keyed.filter((m) => (m.competition || '').toLowerCase().includes(q) ||
      (m.category_slug || '').toLowerCase() === q);
    return catMatch.length ? catMatch : keyed;
  }, [matches, filter, categorySlug]);

  if (!slice.length) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
        No matches to show right now.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {slice.map((m) => {
        const isLive = m.status === 'LIVE' || m.status === 'HT';
        const isFT = m.status === 'FT';
        const home = m.home.score ?? 0;
        const away = m.away.score ?? 0;
        const homeWin = home > away, awayWin = away > home;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onOpen(m)}
            className="text-left rounded-xl border border-white/[0.05] bg-navy-100/40 hover:border-gold/20 hover:-translate-y-0.5 transition-all p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-gray-500 truncate">
                {m.competition}
              </span>
              {isLive ? (
                <span className="font-mono text-[11px] font-bold text-emerald tracking-wider">{m.minute || 'LIVE'}</span>
              ) : isFT ? (
                <span className="font-display text-[10px] font-bold text-gray-400 uppercase tracking-wider">FT</span>
              ) : (
                <span className="font-mono text-[11px] text-gold/60">{m.kickoff || 'TBD'}</span>
              )}
            </div>
            <div className="space-y-2">
              {['home', 'away'].map((side) => {
                const t = m[side];
                const isWinner = side === 'home' ? homeWin : awayWin;
                return (
                  <div key={side} className="flex items-center justify-between">
                    <span className={`font-body text-sm truncate ${isWinner ? 'text-white' : 'text-gray-400'}`}>{t.name}</span>
                    <span className={`font-display text-xl font-bold tabular-nums ${isWinner ? 'text-gold' : 'text-gray-500'}`}>
                      {t.score ?? (isFT ? 0 : '-')}
                    </span>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StandingsTable({ categorySlug, onOpenMatch }) {
  const { matches } = useAppData();
  const [competitions, setCompetitions] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [competitionSlug, setCompetitionSlug] = useState(null);
  const [seasonSlug, setSeasonSlug] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // Manual nudge — bump this to force a refetch outside the picker effect.
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load the competitions for this sport + the season catalogue once.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.competitions.list(`category__slug=${encodeURIComponent(categorySlug)}&is_active=true`),
      api.seasons.list(),
    ]).then(([cs, ss]) => {
      if (!alive) return;
      const comps = Array.isArray(cs) ? cs : (cs?.results || []);
      const seasonsList = Array.isArray(ss) ? ss : (ss?.results || []);
      setCompetitions(comps);
      setSeasons(seasonsList);
      setCompetitionSlug((prev) => prev || comps[0]?.slug || null);
      setSeasonSlug((prev) => prev
        || seasonsList.find((s) => s.is_current)?.slug
        || seasonsList[0]?.slug
        || null);
    }).catch(() => { /* surface in empty state */ });
    return () => { alive = false; };
  }, [categorySlug]);

  const activeCompetitionName = useMemo(() => {
    const c = competitions.find((x) => x.slug === competitionSlug);
    return (c?.name || '').toLowerCase();
  }, [competitions, competitionSlug]);

  // Re-fetch the rows whenever the filter, manual nudge, or scoreboard says
  // an FT/LIVE→FT transition just happened in the active competition.
  // Backend `Match.post_save` already recomputed standings on the way through
  // FT; this effect simply pulls the fresh rows.
  useEffect(() => {
    if (!competitionSlug || !seasonSlug) { setLoading(false); return; }
    let alive = true;
    if (rows.length === 0) setLoading(true);
    const params = [
      `competition__slug=${encodeURIComponent(competitionSlug)}`,
      `season__slug=${encodeURIComponent(seasonSlug)}`,
    ].join('&');
    api.stats.teamRows(params)
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        list.sort((a, b) => {
          if (a.position != null && b.position != null) return a.position - b.position;
          if (a.position != null) return -1;
          if (b.position != null) return 1;
          return (b.points - a.points)
            || (b.goal_difference - a.goal_difference)
            || (b.goals_for - a.goals_for);
        });
        setRows(list);
        setLastUpdated(new Date());
      })
      .catch(() => { if (alive) setRows([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [competitionSlug, seasonSlug, refreshTick]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Live nudge: AppDataContext keeps the matches array fresh via the scores
  // websocket + 20s poll. When any match in this competition has just gone
  // FT, kick a standings refetch.
  const liveMatchCount = useMemo(() => matches.filter((m) => {
    const comp = (m.competition || '').toLowerCase();
    if (!activeCompetitionName || comp !== activeCompetitionName) return false;
    return m.status === 'LIVE' || m.status === 'HT';
  }).length, [matches, activeCompetitionName]);

  const ftSignature = useMemo(() => matches
    .filter((m) => (m.competition || '').toLowerCase() === activeCompetitionName && m.status === 'FT')
    .map((m) => `${m.id}:${m.home?.score}-${m.away?.score}`)
    .join('|'),
    [matches, activeCompetitionName]);

  useEffect(() => {
    // Skip the first render (initial fetch in the picker effect handles it).
    if (!activeCompetitionName) return;
    setRefreshTick((t) => t + 1);
  }, [ftSignature, activeCompetitionName]);

  // Belt-and-braces poll while at least one match in this competition is in
  // play — covers cases where the WebSocket missed an FT transition.
  useEffect(() => {
    if (liveMatchCount === 0) return undefined;
    const id = setInterval(() => {
      if (!document.hidden) setRefreshTick((t) => t + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [liveMatchCount]);

  const activeComp = competitions.find((c) => c.slug === competitionSlug);
  const activeSeason = seasons.find((s) => s.slug === seasonSlug);

  // Hooks must run on every render in the same order — keep this BEFORE the
  // early returns below.
  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    if (mins < 1) return 'updated just now';
    if (mins === 1) return 'updated 1 min ago';
    return `updated ${mins} min ago`;
  }, [lastUpdated, rows]);

  // Live-match list scoped to this competition.
  const liveMatches = useMemo(() => matches.filter((m) => {
    const comp = (m.competition || '').toLowerCase();
    if (!activeCompetitionName || comp !== activeCompetitionName) return false;
    return m.status === 'LIVE' || m.status === 'HT';
  }), [matches, activeCompetitionName]);

  // Live projection — fold each live match's current score into the official
  // standings. Used to drive the public table during in-play action.
  const projected = useMemo(() => {
    // Start from a deep-ish copy of the official rows keyed by lowercased team name.
    const work = new Map();
    for (const r of rows) {
      const key = (r.team_name || '').toLowerCase();
      work.set(key, {
        ...r,
        _liveDelta: null,         // { hs, as, status, minute, opponent, isHome } when affected
        _origPosition: r.position ?? null,
      });
    }

    for (const m of liveMatches) {
      const hs = m.home?.score ?? 0;
      const as = m.away?.score ?? 0;
      const hKey = (m.home?.name || '').toLowerCase();
      const aKey = (m.away?.name || '').toLowerCase();
      const home = work.get(hKey);
      const away = work.get(aKey);
      // If a participating team isn't on the official sheet (e.g. cup teams from
      // a different division), skip entirely — partial application would mislead.
      if (!home || !away) continue;

      home.played += 1;          away.played += 1;
      home.goals_for += hs;      home.goals_against += as;
      away.goals_for += as;      away.goals_against += hs;
      if (hs > as) {
        home.wins += 1; home.points += 3;
        away.losses += 1;
      } else if (as > hs) {
        away.wins += 1; away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1; away.draws += 1;
        home.points += 1; away.points += 1;
      }
      home.goal_difference = home.goals_for - home.goals_against;
      away.goal_difference = away.goals_for - away.goals_against;
      home._liveDelta = { hs, as, status: m.status, minute: m.minute, opponent: m.away.name, isHome: true,  matchId: m.id };
      away._liveDelta = { hs, as, status: m.status, minute: m.minute, opponent: m.home.name, isHome: false, matchId: m.id };
    }

    // Re-rank by points, GD, GF; assign a fresh provisional position.
    const sorted = Array.from(work.values()).sort((a, b) =>
      (b.points - a.points)
      || (b.goal_difference - a.goal_difference)
      || (b.goals_for - a.goals_for)
      || a.team_name.localeCompare(b.team_name));

    sorted.forEach((r, i) => {
      r._livePosition = i + 1;
      if (r._origPosition != null && r._liveDelta) {
        r._move = r._origPosition - r._livePosition;  // positive = climbed
      } else {
        r._move = 0;
      }
    });

    return sorted;
  }, [rows, liveMatches]);

  // Two modes: 'live' folds in current LIVE/HT scores; 'official' shows only
  // FT-settled totals. Default to live whenever there's an in-play match.
  const [tableMode, setTableMode] = useState('live');
  const hasLive = liveMatches.length > 0;
  const showLive = tableMode === 'live' && hasLive;
  const displayRows = showLive ? projected : rows;

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 size={22} className="text-gold animate-spin" />
      </div>
    );
  }

  if (!competitions.length) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
        No active competitions configured for this sport yet. Editors can add one
        from the admin dashboard under <span className="text-gold">Stats → Competitions</span>.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Competition + season pickers */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {competitions.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCompetitionSlug(c.slug)}
              className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors ${
                c.slug === competitionSlug
                  ? 'bg-gold/10 text-gold border-gold/40'
                  : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
              }`}
            >
              {c.name}
              {c.scope && c.scope !== 'general' && (
                <span className="ml-1 text-[9px] opacity-70">· {c.scope}</span>
              )}
            </button>
          ))}
        </div>
        {seasons.length > 1 && (
          <select
            value={seasonSlug || ''}
            onChange={(e) => setSeasonSlug(e.target.value)}
            className="ml-auto px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border border-white/10 bg-navy-100/40 text-gray-300 hover:border-gold/30 focus:border-gold/40 outline-none"
          >
            {seasons.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}{s.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Live status strip + Live ↔ Official toggle */}
      <div className="flex items-center gap-2 text-[11px] font-body text-gray-500 flex-wrap">
        {hasLive && (
          <div className="flex items-center gap-1 mr-1 rounded-full border border-white/10 bg-navy-100/30 p-0.5">
            <button
              type="button"
              onClick={() => setTableMode('live')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-colors inline-flex items-center gap-1 ${
                tableMode === 'live'
                  ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Standings projected with current LIVE / HT scores folded in"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              Live table
            </button>
            <button
              type="button"
              onClick={() => setTableMode('official')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-display uppercase tracking-wider transition-colors ${
                tableMode === 'official'
                  ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Standings using FT results only — the official snapshot"
            >
              Official
            </button>
          </div>
        )}
        {liveMatchCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30 font-display uppercase tracking-wider text-[10px]">
            <Activity size={10} /> {liveMatchCount} match{liveMatchCount === 1 ? '' : 'es'} in play
          </span>
        )}
        {updatedLabel && <span>{updatedLabel}</span>}
        <button type="button" onClick={() => setRefreshTick((t) => t + 1)}
          className="text-gold/70 hover:text-gold underline underline-offset-2">
          refresh now
        </button>
      </div>

      {/* Live-match pills above the table — shows exactly which matches are
          warping the projection right now. Clicking opens the match detail. */}
      {showLive && liveMatches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {liveMatches.map((m) => {
            const hs = m.home?.score ?? 0;
            const as = m.away?.score ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenMatch?.(m)}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/45 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
                <span className="font-display text-[11px] uppercase tracking-wider text-white truncate max-w-[10rem]">
                  {m.home?.name}
                </span>
                <span className="font-mono text-[12px] font-bold text-gold tabular-nums">
                  {hs} - {as}
                </span>
                <span className="font-display text-[11px] uppercase tracking-wider text-white truncate max-w-[10rem]">
                  {m.away?.name}
                </span>
                <span className="font-mono text-[10px] text-red-300 tabular-nums ml-1">
                  {m.minute || (m.status === 'HT' ? 'HT' : 'LIVE')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!rows.length ? (
        <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
          No standings rows for{activeComp ? ` ${activeComp.name}` : ' this competition'}
          {activeSeason ? ` (${activeSeason.name})` : ''} yet. Editors can add them from{' '}
          <span className="text-gold">Stats → Standings</span> in the admin dashboard.
        </div>
      ) : (
        <div className={`rounded-xl border ${showLive ? 'border-red-500/15' : 'border-white/[0.05]'} bg-navy-100/30 overflow-x-auto transition-colors`}>
          {showLive && (
            <div className="px-3 py-1.5 bg-red-500/[0.05] border-b border-red-500/15 text-[10px] font-display uppercase tracking-wider text-red-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              Live table — folding current scores into points. Flip to <span className="text-gold underline underline-offset-2 cursor-pointer" onClick={() => setTableMode('official')}>Official</span> for FT-only totals.
            </div>
          )}
          <table className="min-w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] font-display uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left w-12">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-right">P</th>
                <th className="px-2 py-2 text-right">W</th>
                <th className="px-2 py-2 text-right">D</th>
                <th className="px-2 py-2 text-right">L</th>
                <th className="px-2 py-2 text-right">GF</th>
                <th className="px-2 py-2 text-right">GA</th>
                <th className="px-2 py-2 text-right">GD</th>
                <th className="px-3 py-2 text-right text-gold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, i) => {
                const pos = showLive ? r._livePosition : (r.position ?? i + 1);
                const move = showLive ? (r._move || 0) : 0;
                const isAffected = showLive && r._liveDelta;
                const delta = r._liveDelta;
                return (
                  <tr key={r.id}
                    className={`border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      isAffected ? 'bg-red-500/[0.04]' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-gray-500 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <span>{pos}</span>
                        {move > 0 && (
                          <ArrowUp size={10} className="text-emerald-400" aria-label={`Up ${move}`} />
                        )}
                        {move < 0 && (
                          <ArrowDown size={10} className="text-red-400" aria-label={`Down ${Math.abs(move)}`} />
                        )}
                        {isAffected && move === 0 && (
                          <Minus size={10} className="text-gray-500" aria-label="No position change" />
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-body truncate">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-white">{r.team_name}</span>
                        {isAffected && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30"
                            title={`${delta.isHome ? 'vs' : '@'} ${delta.opponent} · ${delta.hs}-${delta.as} · ${delta.minute || delta.status}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse-live" />
                            {delta.hs}-{delta.as}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-400">{r.played}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-400">{r.wins}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-400">{r.draws}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-400">{r.losses}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-500">{r.goals_for}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gray-500">{r.goals_against}</td>
                    <td className={`px-2 py-2 text-right tabular-nums ${r.goal_difference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.goal_difference > 0 ? '+' : ''}{r.goal_difference}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-display font-bold ${isAffected ? 'text-red-300' : 'text-gold'}`}>
                      {r.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TeamsGrid({ categorySlug, onOpenTeam }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.teams.list(`category__slug=${encodeURIComponent(categorySlug)}`)
      .then((res) => {
        if (!alive) return;
        setTeams(Array.isArray(res) ? res : (res?.results || []));
      })
      .catch(() => { if (alive) setTeams([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 size={22} className="text-gold animate-spin" />
      </div>
    );
  }

  if (!teams.length) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
        No teams on file under this sport yet. Add some from the admin dashboard.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {teams.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onOpenTeam(t.slug)}
          className="group text-left rounded-xl border border-white/[0.05] bg-navy-100/40 hover:border-gold/30 hover:-translate-y-0.5 transition-all p-4 flex items-center gap-3"
        >
          <div className="w-12 h-12 shrink-0 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden">
            {t.logo_url ? (
              <img src={t.logo_url} alt="" className="w-full h-full object-contain" />
            ) : t.flag ? (
              <span className="text-2xl">{t.flag}</span>
            ) : (
              <span className="font-display text-sm text-gold font-bold">
                {(t.short_name || t.name || '?').slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm text-white group-hover:text-gold transition-colors truncate">
              {t.name}
            </div>
            <div className="text-[11px] font-body text-gray-500 truncate">
              {[t.country, t.stadium].filter(Boolean).join(' · ') || 'View profile'}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function SportSection({ categorySlug, sectionSlug, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openStory, setOpenStory] = useState(null);
  const [openMatch, setOpenMatch] = useState(null);
  const [openTeamSlug, setOpenTeamSlug] = useState(null);
  const { categories } = useAppData();

  // If the route is a bare category, bounce to its first active section.
  useEffect(() => {
    if (sectionSlug) return;
    const cat = categories.find((c) => c.slug === categorySlug);
    const first = cat?.sections?.find((s) => s.is_active !== false);
    if (first) navigate(`${categorySlug}/${first.slug}`);
  }, [categorySlug, sectionSlug, categories, navigate]);

  useEffect(() => {
    if (!sectionSlug) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setError(null);
    api.categories.sectionPage(categorySlug, sectionSlug)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || 'Not found'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [categorySlug, sectionSlug]);

  const category = data?.category;
  const section = data?.section;
  const stories = data?.stories || [];

  const siblingSections = useMemo(() => {
    const cat = categories.find((c) => c.slug === categorySlug);
    return cat?.sections || [];
  }, [categories, categorySlug]);

  const renderBody = () => {
    if (!section) return null;
    switch (section.kind) {
      case 'scores':
        return <ScoresWithToggle categorySlug={categorySlug} onOpen={setOpenMatch} />;
      case 'results':
        return <MatchesPanel categorySlug={categorySlug} filter="results" onOpen={setOpenMatch} />;
      case 'fixtures':
        return <MatchesPanel categorySlug={categorySlug} filter="fixtures" onOpen={setOpenMatch} />;
      case 'standings':
        return <StandingsTable categorySlug={categorySlug} onOpenMatch={setOpenMatch} />;
      case 'teams':
        return <TeamsGrid categorySlug={categorySlug} onOpenTeam={setOpenTeamSlug} />;
      case 'videos':
        return stories.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((s) => <StoryTile key={s.id} story={s} onOpen={setOpenStory} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
            No videos yet. Head to <button type="button" className="text-gold hover:underline" onClick={() => navigate('')}>the home feed</button> for highlights.
          </div>
        );
      case 'custom':
        return section.body ? (
          <article className="prose prose-invert max-w-3xl font-body text-gray-200 whitespace-pre-wrap leading-relaxed">
            {section.body}
          </article>
        ) : (
          <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
            This page is being written.
          </div>
        );
      default: // news / transfers / players — story feed
        return stories.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((s) => <StoryTile key={s.id} story={s} onOpen={setOpenStory} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
            Nothing published under this section yet.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-navy">
        <Loader2 size={24} className="animate-spin text-gold" />
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center bg-navy gap-4 px-4 text-center">
        <Trophy size={32} className="text-gray-600" />
        <div className="font-display text-lg text-white">Section not found</div>
        <p className="text-sm text-gray-500 font-body max-w-md">
          The page you’re looking for may have been moved, deactivated, or never existed.
        </p>
        <button type="button" onClick={() => navigate('')}
          className="mt-2 px-4 py-2 rounded-full border border-gold/40 text-gold text-[12px] font-display uppercase tracking-wider hover:bg-gold/5">
          <ChevronLeft size={14} className="inline -mt-0.5 mr-1" /> Back to home
        </button>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-navy">
      <div
        className="relative px-4 sm:px-8 pt-28 sm:pt-32 pb-10 border-b border-white/[0.05]"
        style={{
          backgroundImage: category?.cover_url
            ? `linear-gradient(135deg, ${category.color}aa 0%, ${category.color}33 50%, rgba(15,31,58,0.95) 100%), url(${category.cover_url})`
            : `linear-gradient(135deg, ${category?.color || '#0f1f3a'}33, ${category?.color || '#0f1f3a'}10)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          <button type="button" onClick={() => navigate('')}
            className="inline-flex items-center gap-1 text-[11px] font-display uppercase tracking-wider text-white/70 hover:text-gold mb-3">
            <ChevronLeft size={13} /> Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{section.icon || category?.icon}</span>
            <h1 className="font-display text-2xl sm:text-4xl font-bold uppercase tracking-wider text-white">
              {category?.name}
              <span className="text-gold/60 mx-2">·</span>
              <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">{section.name}</span>
            </h1>
          </div>
          {section.intro && (
            <p className="text-gray-200 font-body max-w-2xl drop-shadow">{section.intro}</p>
          )}

          {siblingSections.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {siblingSections.map((s) => {
                const active = s.slug === section.slug;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`${categorySlug}/${s.slug}`)}
                    className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors ${
                      active
                        ? 'bg-gold text-navy border-gold'
                        : 'bg-white/5 text-white border-white/15 hover:border-gold/40'
                    }`}
                  >
                    {s.icon && <span className="mr-1">{s.icon}</span>}{s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-10">
        {renderBody()}
      </div>

      {openStory && <StoryReader story={openStory} onClose={() => setOpenStory(null)} />}
      {openMatch && <MatchDetailModal match={openMatch} onClose={() => setOpenMatch(null)} />}
      {openTeamSlug && (
        <Suspense fallback={null}>
          <TeamDetail slug={openTeamSlug} onClose={() => setOpenTeamSlug(null)} />
        </Suspense>
      )}
    </section>
  );
}
