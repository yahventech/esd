// EASD Admin — Analytics dashboard.
//
// All charts are hand-rolled inline SVG so the admin bundle stays light (no
// recharts/d3 dependency) while still giving us animated entrances, hover
// tooltips, and palette-matched styling. Each card autoloads its own slice of
// the analytics API and gracefully falls back to a friendly empty state when
// the tracker hasn't yet produced data.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Eye, Users, Clock, Newspaper, Film, ArrowRightLeft, MessageSquare,
  Bookmark as BookmarkIcon, Mail, RefreshCw, TrendingUp, TrendingDown, Minus,
  Smartphone, Monitor, Tablet, Bot, Globe, Loader2, Calendar, Zap, Trophy, Layers,
} from 'lucide-react';
import { api } from '../../lib/api';

// --- Chart primitives ----------------------------------------------------- //

const GOLD = '#FFD700';
const EMERALD = '#00C17A';
const SKY = '#38BDF8';
const ROSE = '#F43F5E';
const VIOLET = '#A78BFA';
const ORANGE = '#FB923C';
const PALETTE = [GOLD, EMERALD, SKY, VIOLET, ROSE, ORANGE, '#22D3EE', '#FACC15', '#34D399', '#F472B6'];

function niceTickStep(max) {
  if (max <= 5) return 1;
  if (max <= 10) return 2;
  if (max <= 50) return 10;
  if (max <= 100) return 20;
  if (max <= 500) return 100;
  if (max <= 1000) return 200;
  if (max <= 5000) return 1000;
  return Math.pow(10, Math.floor(Math.log10(max)));
}

function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDelta(pct) {
  if (pct == null) return null;
  const arrow = pct > 0 ? '+' : pct < 0 ? '' : '';
  return `${arrow}${pct.toFixed(1)}%`;
}

function LineChart({ series, height = 260, animationKey = 0, xLabel = 'Date', yLabel = 'Count' }) {
  // series: [{label, color, data: [{x: 'YYYY-MM-DD', y: number}]}]
  const [hover, setHover] = useState(null);
  const points = series[0]?.data || [];
  if (!points.length) {
    return <EmptyChart label="No traffic data yet" hint="Page views will appear here as soon as the tracker captures some traffic. Browse the site in another tab to seed it." />;
  }
  const PAD_L = 56, PAD_R = 24, PAD_T = 24, PAD_B = 58;
  const W = 900, H = height;
  const allY = series.flatMap((s) => s.data.map((d) => d.y));
  const maxY = Math.max(1, ...allY);
  const step = niceTickStep(maxY);
  const yTop = Math.ceil(maxY / step) * step;
  const xCount = points.length;
  const xFor = (i) => PAD_L + ((W - PAD_L - PAD_R) * (xCount === 1 ? 0.5 : i / (xCount - 1)));
  const yFor = (v) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / yTop);

  const gridLines = [];
  for (let v = 0; v <= yTop; v += step) gridLines.push(v);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={`gradient-${i}`} id={`linegrad-${i}-${animationKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {/* Y-axis title (rotated) */}
        <text x={16} y={H / 2} transform={`rotate(-90 16 ${H / 2})`} textAnchor="middle"
          fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
          {yLabel.toUpperCase()}
        </text>
        {/* X-axis title */}
        <text x={(W + PAD_L - PAD_R) / 2} y={H - 10} textAnchor="middle"
          fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
          {xLabel.toUpperCase()}
        </text>
        {gridLines.map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yFor(g)} y2={yFor(g)} stroke="rgba(255,255,255,0.07)" strokeDasharray="2 4" />
            <text x={PAD_L - 8} y={yFor(g) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="monospace">
              {formatNumber(g)}
            </text>
          </g>
        ))}
        {/* Baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={yFor(0)} y2={yFor(0)} stroke="rgba(255,255,255,0.15)" />
        {points.map((p, i) => {
          // Show ~7 x-axis tick labels evenly spaced
          const labelStride = Math.max(1, Math.floor(xCount / 7));
          if (i % labelStride !== 0 && i !== xCount - 1) return null;
          return (
            <g key={p.x + i}>
              <line x1={xFor(i)} y1={yFor(0)} x2={xFor(i)} y2={yFor(0) + 4} stroke="rgba(255,255,255,0.25)" />
              <text x={xFor(i)} y={H - PAD_B + 16} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)" fontFamily="Source Sans 3, sans-serif">
                {new Date(p.x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            </g>
          );
        })}
        {series.map((s, sIdx) => {
          const pathD = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.y)}`).join(' ');
          const areaD = pathD + ` L ${xFor(s.data.length - 1)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z`;
          return (
            <g key={s.label}>
              <path d={areaD} fill={`url(#linegrad-${sIdx}-${animationKey})`} className="line-area" />
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 3000, strokeDashoffset: 3000, animation: `line-draw-${animationKey} 1.2s ease-out forwards` }} />
              {s.data.map((d, i) => (
                <circle key={`${sIdx}-${i}`} cx={xFor(i)} cy={yFor(d.y)} r={hover && hover.i === i ? 4 : 0}
                  fill={s.color} stroke="#0A1628" strokeWidth="2" />
              ))}
            </g>
          );
        })}
        {/* Hover guide line */}
        {hover != null && (
          <line x1={xFor(hover.i)} x2={xFor(hover.i)} y1={PAD_T} y2={yFor(0)}
            stroke="rgba(255,215,0,0.35)" strokeDasharray="3 3" />
        )}
        {/* Invisible hit areas for hover */}
        {points.map((_, i) => (
          <rect key={`hit-${i}`} x={xFor(i) - 12} y={PAD_T} width="24" height={H - PAD_T - PAD_B}
            fill="transparent"
            onMouseEnter={() => setHover({ i })}
            onMouseLeave={() => setHover(null)} />
        ))}
      </svg>
      <style>{`
        @keyframes line-draw-${animationKey} { to { stroke-dashoffset: 0; } }
        .line-area { opacity: 0; animation: line-fade-${animationKey} 0.8s ease-out 0.4s forwards; }
        @keyframes line-fade-${animationKey} { to { opacity: 1; } }
      `}</style>
      {/* Legend + hover readout */}
      <div className="mt-3 flex items-center justify-between gap-4 text-[12px] font-body flex-wrap">
        <div className="flex items-center gap-4">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 text-gray-300">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        {hover != null && (
          <div className="flex items-center gap-3 text-[12px] font-body">
            <span className="text-gray-500">
              {new Date(points[hover.i]?.x).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            {series.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1">
                <span className="text-gray-500">{s.label}:</span>
                <span className="font-mono font-semibold text-white">{formatNumber(s.data[hover.i]?.y || 0)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BarChart({ data, height = 280, color = GOLD, xLabel = '', yLabel = 'Count' }) {
  // data: [{label, value, color?}]. Long labels are rotated -35° so they
  // never overlap, and we always show the full label on hover.
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data.length) {
    return <EmptyChart label="No data yet" hint="Numbers will appear here as visitors interact with the site." />;
  }
  // Bigger bottom padding so rotated labels fit without clipping.
  const PAD_L = 56, PAD_R = 24, PAD_T = 24, PAD_B = 96;
  const W = 900, H = height;
  const maxV = Math.max(1, ...data.map((d) => d.value));
  const step = niceTickStep(maxV);
  const yTop = Math.ceil(maxV / step) * step;
  const bw = (W - PAD_L - PAD_R) / data.length;
  const gap = Math.min(10, bw * 0.18);
  const baseY = H - PAD_B;

  // Y-grid lines — show 5 evenly stepped ticks.
  const ticks = [];
  for (let v = 0; v <= yTop; v += step) ticks.push(v);
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis title */}
        <text x={16} y={H / 2 - 30} transform={`rotate(-90 16 ${H / 2 - 30})`} textAnchor="middle"
          fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
          {yLabel.toUpperCase()}
        </text>
        {/* X-axis title */}
        {xLabel && (
          <text x={(W + PAD_L - PAD_R) / 2} y={H - 6} textAnchor="middle"
            fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
            {xLabel.toUpperCase()}
          </text>
        )}
        {ticks.map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + (H - PAD_T - PAD_B) * (1 - g / yTop)} y2={PAD_T + (H - PAD_T - PAD_B) * (1 - g / yTop)} stroke="rgba(255,255,255,0.07)" strokeDasharray="2 4" />
            <text x={PAD_L - 8} y={PAD_T + (H - PAD_T - PAD_B) * (1 - g / yTop) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)" fontFamily="monospace">
              {formatNumber(g)}
            </text>
          </g>
        ))}
        {/* Baseline */}
        <line x1={PAD_L} x2={W - PAD_R} y1={baseY} y2={baseY} stroke="rgba(255,255,255,0.15)" />
        {data.map((d, i) => {
          const x = PAD_L + i * bw + gap / 2;
          const h = (H - PAD_T - PAD_B) * (d.value / yTop);
          const y = H - PAD_B - h;
          const w = bw - gap;
          const labelX = x + w / 2;
          const labelY = baseY + 14;
          const hovered = hoverIdx === i;
          return (
            <g key={d.label + i}
               onMouseEnter={() => setHoverIdx(i)}
               onMouseLeave={() => setHoverIdx(null)}>
              {/* Bigger transparent hit area so hover works even off the bar */}
              <rect x={x - 2} y={PAD_T} width={w + 4} height={baseY - PAD_T} fill="transparent" />
              <g style={{
                transformOrigin: `${x + w / 2}px ${baseY}px`,
                transform: 'scaleY(0)',
                animation: `bar-grow 0.7s cubic-bezier(.2,.7,.3,1) ${i * 0.05}s forwards`,
              }}>
                <rect x={x} y={y} width={w} height={h} rx={3} fill={d.color || color}
                      opacity={hovered ? 1 : 0.85} />
              </g>
              {/* Tick mark */}
              <line x1={labelX} x2={labelX} y1={baseY} y2={baseY + 4} stroke="rgba(255,255,255,0.25)" />
              {/* Rotated label so long names fit. Anchored at top-right of the tick. */}
              <text
                x={labelX}
                y={labelY}
                fontSize="11"
                fill={hovered ? 'rgba(255,215,0,0.95)' : 'rgba(255,255,255,0.75)'}
                fontFamily="Source Sans 3, sans-serif"
                textAnchor="end"
                transform={`rotate(-35 ${labelX} ${labelY})`}
              >
                {d.label.length > 22 ? d.label.slice(0, 20) + '…' : d.label}
              </text>
              {d.value > 0 && (
                <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.92)"
                      fontFamily="monospace" fontWeight="600"
                      style={{ opacity: 0, animation: `fade-up 0.4s ease-out ${0.5 + i * 0.05}s forwards` }}>
                  {formatNumber(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <style>{`
        @keyframes bar-grow { to { transform: scaleY(1); } }
        @keyframes fade-up { to { opacity: 1; } }
      `}</style>
      {/* Hovered full-label readout — covers the truncated case */}
      {hoverIdx != null && (
        <div className="mt-2 text-center text-[12px] font-body text-gray-300">
          <span className="font-display uppercase tracking-wider text-gray-500 mr-2">
            {data[hoverIdx]?.label}
          </span>
          <span className="font-mono font-semibold text-gold">{formatNumber(data[hoverIdx]?.value || 0)}</span>
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, size = 220, centerLabel = '' }) {
  // data: [{label, value, color?}]
  if (!data.length || data.every((d) => !d.value)) {
    return <EmptyChart label="No data yet" hint="Once the tracker captures sessions, the device breakdown will appear here." />;
  }
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const inner = r * 0.6;
  let accAngle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const a0 = accAngle;
    const a1 = accAngle + angle;
    accAngle = a1;
    const sx0 = cx + r * Math.cos(a0), sy0 = cy + r * Math.sin(a0);
    const sx1 = cx + r * Math.cos(a1), sy1 = cy + r * Math.sin(a1);
    const ix0 = cx + inner * Math.cos(a0), iy0 = cy + inner * Math.sin(a0);
    const ix1 = cx + inner * Math.cos(a1), iy1 = cy + inner * Math.sin(a1);
    const large = angle > Math.PI ? 1 : 0;
    const path = [
      `M ${sx0} ${sy0}`,
      `A ${r} ${r} 0 ${large} 1 ${sx1} ${sy1}`,
      `L ${ix1} ${iy1}`,
      `A ${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0}`,
      'Z',
    ].join(' ');
    return { path, color: d.color || PALETTE[i % PALETTE.length], label: d.label, value: d.value, pct: ((d.value / total) * 100).toFixed(1) };
  });
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color}
            style={{ opacity: 0, transformOrigin: `${cx}px ${cy}px`, animation: `donut-in 0.5s ease-out ${i * 0.08}s forwards` }} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="white" fontFamily="Oswald, sans-serif">
          {formatNumber(total)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="Oswald, sans-serif" letterSpacing="1.5">
          {(centerLabel || 'TOTAL').toUpperCase()}
        </text>
      </svg>
      <div className="flex-1 min-w-[10rem] space-y-1.5">
        {arcs.map((a) => (
          <div key={a.label} className="flex items-center justify-between gap-2 text-[12px] font-body">
            <span className="inline-flex items-center gap-2 text-gray-300 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              <span className="truncate">{a.label}</span>
            </span>
            <span className="font-mono text-gray-400 shrink-0">
              {formatNumber(a.value)} <span className="text-gray-600">({a.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes donut-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

function HourHeatmap({ series }) {
  // 24 hour cells, intensity ∝ views.
  const slots = useMemo(() => {
    const map = new Map();
    for (const r of series || []) {
      const h = new Date(r.hour).getHours();
      map.set(h, (map.get(h) || 0) + r.views);
    }
    return Array.from({ length: 24 }, (_, h) => ({ hour: h, views: map.get(h) || 0 }));
  }, [series]);
  const max = Math.max(1, ...slots.map((s) => s.views));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1.5">
        {slots.map((s) => {
          const intensity = s.views / max;
          const bg = `rgba(255, 215, 0, ${Math.max(0.04, intensity * 0.85)})`;
          return (
            <div
              key={s.hour}
              title={`${String(s.hour).padStart(2, '0')}:00 — ${s.views} views`}
              className="aspect-square rounded-md border border-white/[0.04] flex items-end justify-center text-[9px] text-gray-500 font-mono"
              style={{ backgroundColor: bg }}
            >
              {String(s.hour).padStart(2, '0')}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 font-body">
        <span>0</span>
        <div className="flex">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => (
            <div key={i} className="w-3 h-2" style={{ backgroundColor: `rgba(255, 215, 0, ${i})` }} />
          ))}
        </div>
        <span>{max}</span>
      </div>
    </div>
  );
}

function EmptyChart({ label, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 p-8 text-center">
      <div className="font-display text-sm text-gray-400 uppercase tracking-wider">{label}</div>
      {hint && <div className="text-[11px] text-gray-600 font-body mt-1">{hint}</div>}
    </div>
  );
}

// --- Cards / sections ---------------------------------------------------- //

function StatTile({ icon: Icon, label, value, valueSuffix, hint, delta, accent = 'gold', tooltip }) {
  const arrow = delta == null ? null : delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />;
  const deltaCls = delta == null
    ? 'text-gray-500'
    : delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-gray-500';
  const tones = {
    gold: 'from-gold/20 to-yellow-500/10 border-gold/30 text-gold',
    emerald: 'from-emerald-500/20 to-emerald-700/10 border-emerald-500/30 text-emerald-300',
    sky: 'from-sky-500/20 to-sky-700/10 border-sky-500/30 text-sky-300',
    violet: 'from-violet-500/20 to-violet-700/10 border-violet-500/30 text-violet-300',
  };
  return (
    <div title={tooltip} className={`relative rounded-xl border bg-gradient-to-br ${tones[accent]} p-4 overflow-hidden animate-fade-in`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <Icon size={16} />
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono ${deltaCls}`}>
            {arrow} {formatDelta(delta)}
          </span>
        )}
      </div>
      <div className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums">
        {formatNumber(value)}
        {valueSuffix && <span className="text-base font-display text-white/60 ml-1">{valueSuffix}</span>}
      </div>
      <div className="font-display text-[11px] uppercase tracking-[0.15em] text-white/80 mt-1">{label}</div>
      {hint && <div className="text-[11px] font-body text-white/55 mt-0.5">{hint}</div>}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-navy-100/40 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-gold/80" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-base font-bold text-white tabular-nums">{formatNumber(value)}</div>
        <div className="font-display text-[10px] uppercase tracking-wider text-gray-500 truncate">{label}</div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, action, children, padding = true }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-navy-100/30 overflow-hidden animate-fade-in">
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/[0.05]">
          <div className="min-w-0">
            <h3 className="font-display text-[12px] uppercase tracking-[0.18em] text-gold/80 truncate">{title}</h3>
            {subtitle && (
              <p className="text-[11px] font-body text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={padding ? 'p-4' : ''}>{children}</div>
    </div>
  );
}

// --- Main component ------------------------------------------------------ //

const DEVICE_ICON = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  bot: Bot,
  unknown: Globe,
};

const EVENT_LABEL = {
  view: 'View', click: 'Click', search: 'Search', bookmark: 'Bookmark',
  unbookmark: 'Unbookmark', share: 'Share', like: 'Like', unlike: 'Unlike',
  comment: 'Comment', reaction: 'Reaction', video_play: 'Video play',
  transfer_open: 'Transfer open', session_start: 'Session start', page_leave: 'Page leave',
};

export default function AnalyticsManager({ showToast }) {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [content, setContent] = useState(null);
  const [devices, setDevices] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [bump, setBump] = useState(0);
  const realtimeTimerRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, h, c, d, e, rt] = await Promise.all([
        api.analytics.summary(days),
        api.analytics.traffic(days),
        api.analytics.hourly(),
        api.analytics.content(days),
        api.analytics.devices(days),
        api.analytics.engagement(days),
        api.analytics.realtime(),
      ]);
      setSummary(s); setTraffic(t); setHourly(h); setContent(c);
      setDevices(d); setEngagement(e); setRealtime(rt);
      setBump((n) => n + 1); // retrigger SVG line animations
    } catch (err) {
      showToast?.showError?.(err.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [days, showToast]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh realtime panel every 12s while the manager is mounted.
  useEffect(() => {
    realtimeTimerRef.current = setInterval(() => {
      api.analytics.realtime().then((rt) => setRealtime(rt)).catch(() => { /* ignore */ });
    }, 12_000);
    return () => clearInterval(realtimeTimerRef.current);
  }, []);

  const trafficSeries = useMemo(() => {
    const rows = traffic?.series || [];
    return [
      { label: 'Page views', color: GOLD, data: rows.map((r) => ({ x: r.date, y: r.views })) },
      { label: 'Unique sessions', color: EMERALD, data: rows.map((r) => ({ x: r.date, y: r.uniques })) },
    ];
  }, [traffic]);

  const engagementBars = useMemo(() => {
    return (engagement?.by_type || []).map((r, i) => ({
      label: EVENT_LABEL[r.type] || r.type,
      value: r.count,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [engagement]);

  const categoryBars = useMemo(() => {
    return (content?.categories || []).slice(0, 8).map((c, i) => ({
      label: c.name || c.slug || '—',
      value: c.views,
      color: c.color || PALETTE[i % PALETTE.length],
    }));
  }, [content]);

  const devicesDonut = useMemo(() => {
    return (devices?.devices || []).map((d) => ({
      label: (d.device || 'unknown').charAt(0).toUpperCase() + (d.device || 'unknown').slice(1),
      value: d.views,
    }));
  }, [devices]);

  const referrerBars = useMemo(() => {
    return (devices?.referrers || []).slice(0, 8).map((r, i) => ({
      label: r.source || 'direct',
      value: r.views,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [devices]);

  if (loading && !summary) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg uppercase tracking-wider text-white flex items-center gap-2">
            <Activity size={18} className="text-gold" />
            <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Analytics</span>
          </h2>
          <p className="text-[12px] font-body text-gray-500 mt-1">
            Visitor traffic, engagement, and content performance over the last {summary?.window_days || days} days. Switch the window with the chips on the right.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 rounded-full border border-white/10 bg-white/[0.02]">
            {[7, 30, 90, 365].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(n)}
                className={`px-3 py-1 rounded-full font-display text-[10px] uppercase tracking-wider transition-colors ${
                  days === n ? 'bg-gold text-navy' : 'text-gray-400 hover:text-white'
                }`}
              >
                {n === 365 ? '1y' : `${n}d`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-full border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Big stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Eye}
          label="Page views"
          value={summary?.views?.value || 0}
          delta={summary?.views?.delta_pct}
          hint={`vs previous ${days}d`}
          accent="gold"
          tooltip="Total page renders tracked by the frontend pixel in this window."
        />
        <StatTile
          icon={Users}
          label="Unique visitors"
          value={summary?.unique_visitors?.value || 0}
          delta={summary?.unique_visitors?.delta_pct}
          hint="distinct sessions"
          accent="emerald"
          tooltip="Distinct browser sessions in the window — identified by a persistent localStorage id."
        />
        <StatTile
          icon={Activity}
          label="Engagement events"
          value={summary?.events || 0}
          hint="clicks, plays, bookmarks…"
          accent="sky"
          tooltip="Discrete actions outside of plain page views: bookmark, video play, transfer open, etc."
        />
        <StatTile
          icon={Clock}
          label="Avg time on page"
          value={Math.round((summary?.avg_duration_ms || 0) / 1000)}
          valueSuffix="s"
          hint="seconds between navigations"
          accent="violet"
          tooltip="Mean dwell time on a page before the visitor navigated away. Pages still in flight are excluded."
        />
      </div>

      {/* Mini totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <MiniStat icon={Newspaper} label="Stories"  value={summary?.totals?.stories || 0} />
        <MiniStat icon={Film}      label="Videos"   value={summary?.totals?.videos || 0} />
        <MiniStat icon={ArrowRightLeft} label="Transfers" value={summary?.totals?.transfers || 0} />
        <MiniStat icon={Trophy}    label="Matches"  value={summary?.totals?.matches || 0} />
        <MiniStat icon={MessageSquare} label="Comments" value={summary?.totals?.comments || 0} />
        <MiniStat icon={BookmarkIcon} label="Bookmarks" value={summary?.totals?.bookmarks || 0} />
        <MiniStat icon={Mail}      label="Subscribers" value={summary?.totals?.subscribers || 0} />
      </div>

      {/* Traffic line chart — full width */}
      <Card
        title="Traffic over time"
        subtitle="Daily page views (gold) vs unique visitor sessions (green). Hover any day for exact numbers."
        action={
          <span className="text-[11px] font-body text-gray-500 inline-flex items-center gap-1">
            <Calendar size={12} /> Last {days} days
          </span>
        }
      >
        <LineChart series={trafficSeries} animationKey={bump} xLabel="Date" yLabel="Page views" />
      </Card>

      {/* Two-up: realtime + engagement */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Live activity"
          subtitle="Most recent visitor actions across the site. Refreshes every 12 seconds."
          action={
            <span className="inline-flex items-center gap-1 text-[10px] font-display uppercase tracking-wider text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-live absolute h-full w-full rounded-full bg-emerald opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald" />
              </span>
              {realtime?.active_sessions || 0} active
            </span>
          }
        >
          <div className="max-h-[280px] overflow-y-auto space-y-1">
            {(realtime?.events || []).length === 0 ? (
              <div className="text-center text-[12px] text-gray-500 font-body italic py-8">
                No activity in the last 30 minutes.
              </div>
            ) : (
              realtime.events.map((ev, i) => {
                const Icon = DEVICE_ICON[ev.device_type] || Globe;
                const evLabel = EVENT_LABEL[ev.event_type] || ev.event_type;
                return (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
                    <Icon size={12} className="text-gray-500 shrink-0" />
                    <span className="font-display text-[10px] uppercase tracking-wider text-gold/80 shrink-0">{evLabel}</span>
                    <span className="text-[11px] font-body text-gray-400 truncate flex-1">
                      {ev.target_label || ev.target_type || '—'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 shrink-0">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card
          title="Engagement by event"
          subtitle="What visitors are doing. Each bar is one event type."
        >
          <BarChart data={engagementBars} height={300} xLabel="Event type" yLabel="Count" />
        </Card>

        <Card
          title="Hourly traffic — last 24h"
          subtitle="Darker = more page views in that hour. Hover any tile for the count."
        >
          <HourHeatmap series={hourly?.series} />
        </Card>
      </div>

      {/* Categories + Devices */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Top sport categories"
          subtitle="Page views grouped by the sport the visitor was reading."
        >
          <BarChart data={categoryBars} height={300} xLabel="Sport" yLabel="Page views" />
        </Card>
        <Card
          title="Device breakdown"
          subtitle="How visitors are connecting. Useful for prioritising mobile vs desktop QA."
        >
          <DonutChart data={devicesDonut} centerLabel="Sessions" />
        </Card>
      </div>

      {/* Top stories table + referrers */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title={`Top stories · ${days}d`}
          subtitle="Most-viewed published stories in this window."
          padding={false}
        >
          <div className="divide-y divide-white/[0.04]">
            {(content?.top_stories || []).length === 0 ? (
              <div className="p-6 text-center text-[12px] text-gray-500 font-body italic">No story analytics yet.</div>
            ) : (
              content.top_stories.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <span className="font-display text-base font-bold text-gold/30 w-6 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[10px] uppercase tracking-wider text-gold/70 mb-0.5 truncate">
                      {s.category}
                    </div>
                    <div className="text-[12px] text-white font-body leading-snug line-clamp-2">
                      {s.headline}
                    </div>
                    <div className="mt-1 text-[10px] text-gray-500 flex items-center gap-2 font-mono">
                      <span className="inline-flex items-center gap-0.5"><Eye size={10} /> {formatNumber(s.views)}</span>
                      {s.comment_count > 0 && (
                        <span className="inline-flex items-center gap-0.5"><MessageSquare size={10} /> {s.comment_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card
          title="Top videos"
          subtitle="Ranked by lifetime plays. Independent of the window above."
          padding={false}
        >
          <div className="divide-y divide-white/[0.04]">
            {(content?.top_videos || []).length === 0 ? (
              <div className="p-6 text-center text-[12px] text-gray-500 font-body italic">No video data yet.</div>
            ) : (
              content.top_videos.slice(0, 8).map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <span className="font-display text-base font-bold text-gold/30 w-6 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-12 h-8 rounded bg-navy-200 overflow-hidden shrink-0">
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-navy-200 to-charcoal" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-white font-body leading-snug line-clamp-2">{v.title}</div>
                    <div className="text-[10px] text-gray-500 font-mono inline-flex items-center gap-0.5">
                      <Eye size={10} /> {formatNumber(v.view_count)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card
          title="Top transfers"
          subtitle="Most-opened transfer items. Breaking moves are flagged."
          padding={false}
        >
          <div className="divide-y divide-white/[0.04]">
            {(content?.top_transfers || []).length === 0 ? (
              <div className="p-6 text-center text-[12px] text-gray-500 font-body italic">No transfer analytics yet.</div>
            ) : (
              content.top_transfers.slice(0, 8).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <span className="font-display text-base font-bold text-gold/30 w-6 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-white font-body leading-snug truncate flex items-center gap-1">
                      {t.is_breaking && <Zap size={10} className="text-red-400 shrink-0" />}
                      {t.player_name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-body truncate">
                      {(t.from_club || 'Free')} → {(t.to_club || 'TBD')}
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono inline-flex items-center gap-0.5">
                      <Eye size={10} /> {formatNumber(t.view_count)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Referrers */}
      <Card
        title="Where visitors come from"
        subtitle="Top referring hosts in this window. 'direct / app' covers visits with no referrer header (typed URLs, bookmarks, the EASD app shell)."
      >
        <BarChart data={referrerBars} height={280} xLabel="Source" yLabel="Page views" />
      </Card>

      {/* Tracker hint footer */}
      <div className="rounded-xl border border-white/[0.04] bg-navy-100/20 p-4 flex items-start gap-3">
        <Layers size={16} className="text-gold/50 shrink-0 mt-0.5" />
        <div className="text-[12px] font-body text-gray-400 leading-relaxed">
          <span className="text-white font-semibold">How this works.</span> The tracker fires from the frontend on every route change and key interaction (bookmark, video play, transfer open). Charts are tinted gold for primary metrics, emerald for unique sessions, sky for engagement. Bar labels rotate so long event names ('Transfer card open', 'Session start') fit without clipping; hover any bar to see the full label and exact value. <span className="text-white">Privacy:</span> IP addresses are hashed at write time and never reach the dashboard, only a stable per-browser id is used to count "unique visitors". The live feed polls every 12 seconds.
        </div>
      </div>
    </div>
  );
}
