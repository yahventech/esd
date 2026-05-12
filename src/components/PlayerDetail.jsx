// EASD Component — PlayerDetail
// Full-screen player page (modal) modeled on premierleague.com/en/players/<id>/<name>/stats.
// Tabs: Overview, Stats. The Stats tab groups season totals into the same buckets
// the PL site uses (Attack, Team play, Discipline, Goalkeeping) and renders only
// the columns we currently track — rest are easy to add later without UI churn.

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, MapPin, Calendar, Ruler, User as UserIcon, Trophy } from 'lucide-react';
import { api } from '../lib/api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'stats',    label: 'Stats' },
];

const POSITION_LABELS = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward',
  COACH: 'Coach / Manager', OTHER: 'Squad member',
};

// premier-league-style stat groupings. Each group has a label + a list of
// [data key, display label, optional hint] tuples. Keys map onto our
// PlayerSeasonStats fields. Groups whose every key resolves to 0 across all
// seasons are hidden so the layout doesn't waste space.
const STAT_GROUPS = [
  {
    title: 'Attack',
    keys: [
      ['goals',      'Goals'],
      ['assists',    'Assists'],
    ],
  },
  {
    title: 'Appearances',
    keys: [
      ['appearances', 'Appearances'],
      ['starts',      'Starts'],
      ['minutes',     'Minutes played'],
    ],
  },
  {
    title: 'Discipline',
    keys: [
      ['yellow_cards', 'Yellow cards'],
      ['red_cards',    'Red cards'],
    ],
  },
  {
    title: 'Goalkeeping',
    keys: [
      ['clean_sheets', 'Clean sheets'],
    ],
    onlyPositions: ['GK'],
  },
];

const CAREER_COLUMNS = [
  ['appearances',  'Apps'],
  ['starts',       'Starts'],
  ['minutes',      'Mins'],
  ['goals',        'Goals', true],
  ['assists',      'Assists'],
  ['yellow_cards', 'Yel'],
  ['red_cards',    'Red'],
  ['clean_sheets', 'CS'],
];

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function HeaderMeta({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-body text-white/80">
      <Icon size={12} className="text-gold/70 shrink-0" />
      <span className="text-white/60">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function KpiTile({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-navy-100/40 px-4 py-3 text-center">
      <div className="font-display text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`font-display text-3xl font-bold tabular-nums mt-0.5 ${accent ? 'text-gold' : 'text-white'}`}>
        {value ?? 0}
      </div>
    </div>
  );
}

function StatGroup({ title, rows }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-4">
      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-3 pb-2 border-b border-white/[0.06]">
        {title}
      </h3>
      <div className="space-y-1.5">
        {rows.map(([key, label, value]) => (
          <div key={key} className="flex items-center justify-between text-[13px] font-body">
            <span className="text-gray-400">{label}</span>
            <span className="font-display font-bold tabular-nums text-white">{value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Overview({ player }) {
  const age = calcAge(player.date_of_birth);
  return (
    <div className="grid sm:grid-cols-3 gap-5">
      <div className="sm:col-span-2 space-y-3">
        <h2 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80">Profile</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] font-body">
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Position</dt>
            <dd className="text-white">{POSITION_LABELS[player.position] || player.position}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Club</dt>
            <dd className="text-white">{player.team_name || 'Free agent'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Date of birth</dt>
            <dd className="text-white">{player.date_of_birth || '—'} {age != null && <span className="text-gray-500">({age})</span>}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Nationality</dt>
            <dd className="text-white">{player.nationality || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Height</dt>
            <dd className="text-white">{player.height_cm ? `${player.height_cm} cm` : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px] uppercase tracking-wider font-display">Shirt number</dt>
            <dd className="text-white">{player.jersey_number != null ? `#${player.jersey_number}` : '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-4 flex items-center justify-center">
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name}
            className="max-w-full max-h-56 object-contain" />
        ) : (
          <div className="text-center py-10">
            <UserIcon size={48} className="text-gray-600 mx-auto mb-2" />
            <p className="text-[12px] font-body text-gray-500 italic">No photo on file</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsPanel({ statsPayload }) {
  const seasonRows = statsPayload?.season_stats || [];
  const allTime = statsPayload?.all_time || {};
  const player = statsPayload?.player || {};
  const [seasonFilter, setSeasonFilter] = useState('all');

  const seasonOptions = useMemo(() => {
    const seen = new Map();
    for (const r of seasonRows) {
      if (!seen.has(r.season_slug)) seen.set(r.season_slug, r.season_name);
    }
    return Array.from(seen.entries()).map(([slug, name]) => ({ slug, name }));
  }, [seasonRows]);

  // Aggregate the visible window — if "All seasons" sum every row; if a specific
  // season is picked, sum just that season's competition rows.
  const aggregate = useMemo(() => {
    const rows = seasonFilter === 'all' ? seasonRows : seasonRows.filter((r) => r.season_slug === seasonFilter);
    if (seasonFilter === 'all') return allTime;
    const out = {};
    for (const r of rows) {
      for (const k of ['appearances', 'starts', 'minutes', 'goals', 'assists',
                       'yellow_cards', 'red_cards', 'clean_sheets']) {
        out[k] = (out[k] || 0) + (r[k] || 0);
      }
    }
    return out;
  }, [seasonFilter, seasonRows, allTime]);

  const visibleGroups = useMemo(() => {
    return STAT_GROUPS
      .filter((g) => !g.onlyPositions || g.onlyPositions.includes(player.position))
      .map((g) => ({
        ...g,
        rows: g.keys.map(([key, label]) => [key, label, aggregate[key]]),
      }))
      .filter((g) => g.rows.some(([, , v]) => v && v > 0))
      // Always show Appearances + Attack groups even if zero so the page never
      // collapses to nothing.
      .concat(
        STAT_GROUPS
          .filter((g) => g.title === 'Appearances' || g.title === 'Attack')
          .filter((g) => !g.onlyPositions || g.onlyPositions.includes(player.position))
          .map((g) => ({ ...g, rows: g.keys.map(([key, label]) => [key, label, aggregate[key]]) }))
      )
      .reduce((acc, g) => {
        // De-dupe by title (the concat above may add Appearances twice).
        if (acc.find((x) => x.title === g.title)) return acc;
        return [...acc, g];
      }, []);
  }, [aggregate, player.position]);

  return (
    <div className="space-y-7">
      {/* Filter row */}
      {seasonOptions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-display text-gray-500 mr-1">Filter</span>
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

      {/* Top KPIs — premier-league.com puts the headline numbers in big tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile label="Appearances" value={aggregate.appearances} />
        <KpiTile label="Goals" value={aggregate.goals} accent />
        <KpiTile label="Assists" value={aggregate.assists} />
        <KpiTile label="Minutes" value={aggregate.minutes} />
      </div>

      {/* Grouped stat blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleGroups.map((g) => (
          <StatGroup key={g.title} title={g.title} rows={g.rows} />
        ))}
      </div>

      {/* Career table — every season + competition the player has logged */}
      <div>
        <h3 className="font-display text-[11px] uppercase tracking-[0.18em] text-gold/80 mb-3">Season-by-season</h3>
        {seasonRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[13px] text-gray-500 font-body italic">
            No season stats recorded yet for this player.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="min-w-full text-[13px] font-body">
              <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
                <tr>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Competition</th>
                  {CAREER_COLUMNS.map(([k, l]) => (
                    <th key={k} className="px-2 py-2 text-right">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {seasonRows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-display text-white">{r.season_name}</td>
                    <td className="px-3 py-2 text-gray-300">{r.competition_name || '—'}</td>
                    {CAREER_COLUMNS.map(([k, l, accent]) => (
                      <td key={k} className={`px-2 py-2 text-right tabular-nums ${accent ? 'text-gold font-bold' : 'text-gray-400'}`}>
                        {r[k] ?? 0}
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

export default function PlayerDetail({ slug, onClose }) {
  const [tab, setTab] = useState('overview');
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true); setError(null);
    Promise.all([
      api.players.detail(slug),
      api.players.stats(slug).catch(() => null),
    ]).then(([p, s]) => {
      if (!alive) return;
      setPlayer(p); setStats(s);
    }).catch((e) => { if (alive) setError(e.message || 'Failed to load player'); })
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

  const age = player ? calcAge(player.date_of_birth) : null;

  return (
    <div className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={onClose}>
      <div className="relative w-full max-w-5xl bg-navy border border-white/10 rounded-none sm:rounded-2xl shadow-2xl shadow-black/70 my-0 sm:my-6"
        onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player page"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 text-gray-400 hover:text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div className="py-32 flex justify-center"><Loader2 size={24} className="animate-spin text-gold" /></div>
        ) : error || !player ? (
          <div className="py-24 px-6 text-center">
            <UserIcon size={32} className="text-gray-600 mx-auto mb-3" />
            <div className="font-display text-lg text-white mb-1">Player not found</div>
            <p className="text-sm text-gray-500 font-body">{error || 'This profile may have been removed.'}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative px-6 sm:px-8 pt-10 pb-6 rounded-t-none sm:rounded-t-2xl overflow-hidden"
              style={{ backgroundImage: `linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.05) 60%, rgba(15,31,58,1))` }}>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full bg-white/5 border border-white/20 flex items-center justify-center overflow-hidden">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={40} className="text-gray-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-display uppercase tracking-[0.18em] text-white/70">
                    {POSITION_LABELS[player.position] || 'Squad member'}
                    {player.jersey_number != null && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-gold/90">
                        #{player.jersey_number}
                      </span>
                    )}
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white truncate">
                    {player.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                    <HeaderMeta icon={Trophy}   label="Club"        value={player.team_name} />
                    <HeaderMeta icon={MapPin}   label="Nationality" value={player.nationality} />
                    <HeaderMeta icon={Calendar} label="Age"         value={age} />
                    <HeaderMeta icon={Ruler}    label="Height"      value={player.height_cm ? `${player.height_cm} cm` : null} />
                  </div>
                </div>
              </div>

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

            {/* Body */}
            <div className="px-6 sm:px-8 py-6">
              {tab === 'overview' && <Overview player={player} />}
              {tab === 'stats' && <StatsPanel statsPayload={stats || { player, season_stats: [], all_time: {} }} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
