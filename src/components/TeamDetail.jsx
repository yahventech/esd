// EASD Component — TeamDetail
// Full-screen team page (rendered as a modal) with three tabs: Overview, Squad,
// and Stats. Stats panel is laid out in the spirit of premierleague.com/en/stats
// — sortable table of season totals + an all-time roll-up + per-player leaders.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  X, Loader2, MapPin, Calendar, User as UserIcon, Globe, Shield,
} from 'lucide-react';
import { api } from '../lib/api';

// Defer the player-stats UI until someone clicks a squad card.
const PlayerDetail = lazy(() => import('./PlayerDetail'));

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'squad',    label: 'Squad' },
  { id: 'stats',    label: 'Stats' },
];

// premierleague.com-style table columns. Order matters — left to right.
const TEAM_STAT_COLUMNS = [
  { key: 'played',          label: 'P',   hint: 'Matches played' },
  { key: 'wins',            label: 'W',   hint: 'Wins' },
  { key: 'draws',           label: 'D',   hint: 'Draws' },
  { key: 'losses',          label: 'L',   hint: 'Losses' },
  { key: 'goals_for',       label: 'GF',  hint: 'Goals scored' },
  { key: 'goals_against',   label: 'GA',  hint: 'Goals conceded' },
  { key: 'goal_difference', label: 'GD',  hint: 'Goal difference' },
  { key: 'clean_sheets',    label: 'CS',  hint: 'Clean sheets' },
  { key: 'points',          label: 'Pts', hint: 'Points', accent: true },
];

const PLAYER_STAT_COLUMNS = [
  { key: 'appearances',   label: 'Apps' },
  { key: 'goals',         label: 'Goals', accent: true },
  { key: 'assists',       label: 'Assists' },
  { key: 'minutes',       label: 'Mins' },
  { key: 'yellow_cards',  label: 'Yel' },
  { key: 'red_cards',     label: 'Red' },
  { key: 'clean_sheets',  label: 'CS' },
];

const POSITION_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3, COACH: 4, OTHER: 5 };

function MetaRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[12px] font-body">
      <Icon size={13} className="text-gold/70 shrink-0" />
      <span className="text-gray-500">{label}:</span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}

function StatBlock({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-navy-100/40 p-3 text-center">
      <div className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${accent ? 'text-gold' : 'text-white'}`}>
        {value ?? 0}
      </div>
    </div>
  );
}

function PlayerCard({ player, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(player.slug)}
      className="group text-left w-full rounded-xl border border-white/[0.05] bg-navy-100/40 p-3 flex items-center gap-3 hover:border-gold/30 hover:-translate-y-0.5 transition-all"
    >
      <div className="w-12 h-12 shrink-0 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center overflow-hidden">
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-sm text-gold font-bold">
            {player.jersey_number ?? '—'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm text-white group-hover:text-gold transition-colors truncate">{player.name}</div>
        <div className="text-[11px] font-body text-gray-500 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[9px] uppercase tracking-wider">
            {player.position}
          </span>
          {player.nationality && <span>· {player.nationality}</span>}
          {player.jersey_number != null && <span>· #{player.jersey_number}</span>}
        </div>
      </div>
    </button>
  );
}

function Overview({ team }) {
  const meta = team || {};
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      <div className="sm:col-span-2 space-y-3">
        <h2 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80">About</h2>
        {meta.description ? (
          <p className="text-[14px] text-gray-300 font-body leading-relaxed whitespace-pre-wrap">{meta.description}</p>
        ) : (
          <p className="text-[13px] text-gray-500 font-body italic">
            No description on file yet. Editors can add one from the admin dashboard.
          </p>
        )}
      </div>
      <div className="space-y-2 rounded-xl border border-white/[0.05] bg-navy-100/30 p-4">
        <h3 className="font-display text-[10px] uppercase tracking-[0.18em] text-gold/80 mb-2">Club info</h3>
        <MetaRow icon={Globe}      label="Country"  value={meta.country} />
        <MetaRow icon={MapPin}     label="Stadium"  value={meta.stadium} />
        <MetaRow icon={UserIcon}   label="Manager"  value={meta.manager} />
        <MetaRow icon={Calendar}   label="Founded"  value={meta.founded} />
        {meta.website && (
          <a href={meta.website} target="_blank" rel="noopener noreferrer"
            className="block pt-2 text-[12px] text-gold hover:underline truncate">
            {meta.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  );
}

function Squad({ players, onOpenPlayer }) {
  const grouped = useMemo(() => {
    const buckets = {};
    for (const p of players) {
      const key = p.position || 'OTHER';
      (buckets[key] = buckets[key] || []).push(p);
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => (POSITION_ORDER[a] ?? 9) - (POSITION_ORDER[b] ?? 9));
  }, [players]);

  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-10 text-center text-gray-500 font-body text-sm">
        No squad on file yet. Add players via the admin dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([pos, list]) => (
        <div key={pos}>
          <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80 mb-3">
            {{ GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards', COACH: 'Coaching staff', OTHER: 'Other' }[pos] || pos}
            <span className="ml-2 text-gray-600 tabular-nums">{list.length}</span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((p) => <PlayerCard key={p.id} player={p} onOpen={onOpenPlayer} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({ statsPayload, players }) {
  const seasonStats = statsPayload?.season_stats || [];
  const allTime = statsPayload?.all_time || {};
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [topPlayers, setTopPlayers] = useState(null);
  const [loadingTop, setLoadingTop] = useState(false);

  const seasonOptions = useMemo(() => {
    const seen = new Map();
    for (const r of seasonStats) {
      if (!seen.has(r.season_slug)) seen.set(r.season_slug, r.season_name);
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [seasonStats]);

  const visibleRows = useMemo(() => {
    if (seasonFilter === 'all') return seasonStats;
    return seasonStats.filter((r) => r.season_slug === seasonFilter);
  }, [seasonStats, seasonFilter]);

  const teamSlug = statsPayload?.team?.slug;
  useEffect(() => {
    if (!teamSlug || !players?.length) { setTopPlayers([]); return; }
    let alive = true;
    setLoadingTop(true);
    api.stats.playerRows(`player__team__slug=${encodeURIComponent(teamSlug)}&ordering=-goals&page_size=10`)
      .then((res) => {
        if (!alive) return;
        const rows = Array.isArray(res) ? res : (res?.results || []);
        // Aggregate per player across competitions/seasons so we see career totals.
        const byPlayer = new Map();
        for (const r of rows) {
          const k = r.player;
          if (!byPlayer.has(k)) {
            byPlayer.set(k, {
              id: k, name: r.player_name, slug: r.player_slug,
              position: r.player_position, photo: r.player_photo,
              goals: 0, assists: 0, appearances: 0, minutes: 0,
              yellow_cards: 0, red_cards: 0, clean_sheets: 0,
            });
          }
          const acc = byPlayer.get(k);
          for (const f of ['goals', 'assists', 'appearances', 'minutes', 'yellow_cards', 'red_cards', 'clean_sheets']) {
            acc[f] += r[f] || 0;
          }
        }
        setTopPlayers(Array.from(byPlayer.values()).sort((a, b) => b.goals - a.goals));
      })
      .catch(() => { if (alive) setTopPlayers([]); })
      .finally(() => { if (alive) setLoadingTop(false); });
    return () => { alive = false; };
  }, [teamSlug, players?.length]);

  return (
    <div className="space-y-7">
      {/* All-time roll-up */}
      <div>
        <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80 mb-3">All-time totals</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {TEAM_STAT_COLUMNS.map((col) => (
            <StatBlock key={col.key} label={col.label} value={allTime[col.key]} accent={col.accent} />
          ))}
        </div>
      </div>

      {/* Per-season table */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80">Season-by-season</h3>
          {seasonOptions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSeasonFilter('all')}
                className={`px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider border transition-all ${
                  seasonFilter === 'all'
                    ? 'border-gold/40 bg-gold/10 text-gold'
                    : 'border-white/[0.06] text-gray-400 hover:text-white'
                }`}
              >All seasons</button>
              {seasonOptions.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setSeasonFilter(s.slug)}
                  className={`px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider border transition-all ${
                    seasonFilter === s.slug
                      ? 'border-gold/40 bg-gold/10 text-gold'
                      : 'border-white/[0.06] text-gray-400 hover:text-white'
                  }`}
                >{s.name}</button>
              ))}
            </div>
          )}
        </div>
        {visibleRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[13px] text-gray-500 font-body italic">
            No season stats recorded yet for this team.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="min-w-full text-[13px] font-body">
              <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
                <tr>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Competition</th>
                  <th className="px-2 py-2 text-right">Pos</th>
                  {TEAM_STAT_COLUMNS.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-right" title={c.hint}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleRows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-display text-white">{r.season_name}</td>
                    <td className="px-3 py-2 text-gray-300">{r.competition_name || '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-gold">{r.position ?? '—'}</td>
                    {TEAM_STAT_COLUMNS.map((c) => (
                      <td key={c.key} className={`px-2 py-2 text-right tabular-nums ${c.accent ? 'text-gold font-bold' : 'text-gray-400'}`}>
                        {r[c.key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Player leaders for this team */}
      <div>
        <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80 mb-3">Player leaders</h3>
        {loadingTop ? (
          <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-gold/60" /></div>
        ) : !topPlayers?.length ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[13px] text-gray-500 font-body italic">
            No player stats recorded yet for this team's squad.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="min-w-full text-[13px] font-body">
              <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
                <tr>
                  <th className="px-3 py-2 w-8">#</th>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-2 py-2 text-right">Pos</th>
                  {PLAYER_STAT_COLUMNS.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-right">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {topPlayers.map((p, i) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 text-gray-500 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 flex items-center gap-2">
                      {p.photo ? (
                        <img src={p.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10" />
                      )}
                      <span className="text-white truncate">{p.name}</span>
                    </td>
                    <td className="px-2 py-2 text-right text-gray-400">{p.position}</td>
                    {PLAYER_STAT_COLUMNS.map((c) => (
                      <td key={c.key} className={`px-2 py-2 text-right tabular-nums ${c.accent ? 'text-gold font-bold' : 'text-gray-400'}`}>
                        {p[c.key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamDetail({ slug, onClose }) {
  const [tab, setTab] = useState('overview');
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openPlayerSlug, setOpenPlayerSlug] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true); setError(null);
    Promise.all([
      api.teams.detail(slug),
      api.teams.squad(slug).catch(() => []),
      api.teams.stats(slug).catch(() => null),
    ]).then(([t, sq, st]) => {
      if (!alive) return;
      setTeam(t); setPlayers(sq || []); setStats(st);
    }).catch((e) => { if (alive) setError(e.message || 'Failed to load team'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const accent = team?.primary_color || '#FFD700';

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={onClose}>
      <div className="relative w-full max-w-5xl bg-navy border border-white/10 rounded-none sm:rounded-2xl shadow-2xl shadow-black/70 my-0 sm:my-6"
        onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close team page"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 text-gray-400 hover:text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="py-32 flex justify-center"><Loader2 size={24} className="animate-spin text-gold" /></div>
        ) : error || !team ? (
          <div className="py-24 px-6 text-center">
            <Shield size={32} className="text-gray-600 mx-auto mb-3" />
            <div className="font-display text-lg text-white mb-1">Team not found</div>
            <p className="text-sm text-gray-500 font-body">{error || 'This team may have been removed.'}</p>
          </div>
        ) : (
          <>
            {/* Header banner */}
            <div
              className="relative px-6 sm:px-8 pt-10 pb-6 rounded-t-none sm:rounded-t-2xl overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(135deg, ${accent}55, ${accent}11 60%, rgba(15,31,58,1) 100%)`,
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center overflow-hidden">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt="" className="w-full h-full object-contain" />
                  ) : team.flag ? (
                    <span className="text-4xl">{team.flag}</span>
                  ) : (
                    <span className="font-display text-xl text-gold font-bold">
                      {(team.short_name || team.name || '?').slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-display uppercase tracking-[0.18em] text-white/70">
                    {team.category_name || 'Team'}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white truncate">
                    {team.name}
                  </h1>
                  <div className="text-[12px] font-body text-white/70 mt-0.5">
                    {[team.country, team.stadium].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              {/* Tab strip */}
              <div className="mt-6 flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-1.5 rounded-t-lg font-display text-[11px] uppercase tracking-wider border-b-2 transition-all ${
                      tab === t.id
                        ? 'border-gold text-gold bg-gold/[0.06]'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab body */}
            <div className="px-6 sm:px-8 py-6">
              {tab === 'overview' && <Overview team={team} />}
              {tab === 'squad' && <Squad players={players} onOpenPlayer={setOpenPlayerSlug} />}
              {tab === 'stats' && <StatsPanel statsPayload={stats} players={players} />}
            </div>
          </>
        )}

        {openPlayerSlug && (
          <Suspense fallback={null}>
            <PlayerDetail slug={openPlayerSlug} onClose={() => setOpenPlayerSlug(null)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
