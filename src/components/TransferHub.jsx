// EASD Component — TransferHub
// The dedicated /transfers page (and /transfers/<sport-slug> variant). Shows
// every published transfer item, grouped by sport with chips to drill down,
// each rendered as a full structured card with player photo, both club crests,
// status pill, reliability meter, fee, contract, and source attribution.
// Tapping a card opens the rich detail modal (lifted from the home preview
// component's earlier incarnation).

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, ArrowLeft, Filter, Loader2, ChevronLeft, Star, Flame,
  Clock, ExternalLink, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { trackEvent } from '../lib/tracker';
import { useAppData } from '../context/AppDataContext';

const STATUS_PILL = {
  rumor:      { label: 'Rumour',     cls: 'bg-gray-500/10 text-gray-300 border-gray-500/30' },
  talks:      { label: 'In talks',   cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  agreed:     { label: 'Agreed',     cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  medical:    { label: 'Medical',    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  here_we_go: { label: 'Here we go', cls: 'bg-gold/20 text-gold border-gold/50' },
  completed:  { label: 'Done deal',  cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50' },
  loan:       { label: 'Loan',       cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
};

function ReliabilityMeter({ value }) {
  const label = ['Speculation', 'Whisper', 'Reported', 'Expected', 'Confirmed'][Math.max(0, Math.min(4, (value || 1) - 1))];
  return (
    <span className="inline-flex items-center gap-1.5" title={`Reliability: ${label}`}>
      <span className="font-display text-[9px] uppercase tracking-wider text-gray-500">Reliability</span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`block w-1.5 h-3 rounded-sm ${n <= (value || 0) ? 'bg-gold/80' : 'bg-white/[0.08]'}`}
          />
        ))}
      </span>
    </span>
  );
}

function ClubBadge({ name, logoUrl, side = 'from' }) {
  if (!name && !logoUrl) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-dashed border-white/15 flex items-center justify-center">
          <span className="text-gray-600 text-[10px] font-body italic">{side === 'from' ? 'Free' : 'TBD'}</span>
        </div>
        <span className="font-display text-[9px] uppercase tracking-wider text-gray-600">
          {side === 'from' ? 'Free agent' : 'Unknown'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0">
      <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 overflow-hidden flex items-center justify-center">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-[11px] text-gold/70 uppercase">{(name || '?').slice(0, 2)}</span>
        )}
      </div>
      <span className="font-display text-[10px] uppercase tracking-wider text-gray-300 text-center max-w-[7rem] truncate">
        {name || (side === 'from' ? 'Free agent' : 'TBD')}
      </span>
    </div>
  );
}

function TransferCard({ item, onOpen }) {
  const pill = STATUS_PILL[item.transfer_status] || STATUS_PILL.rumor;
  return (
    <article
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={`group relative rounded-2xl border bg-navy-100/60 backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        item.is_breaking
          ? 'border-gold/40 shadow-[0_0_30px_-12px_rgba(255,215,0,0.45)] hover:border-gold/70'
          : 'border-white/[0.06] hover:border-gold/30 hover:shadow-gold/[0.08]'
      }`}
    >
      {item.is_breaking && (
        <div className="px-3 py-1 bg-gradient-to-r from-red-500 via-gold to-red-500 text-navy font-display text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 justify-center">
          <Flame size={11} fill="currentColor" /> Breaking
        </div>
      )}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.12em] border ${pill.cls}`}>
            {pill.label}
          </span>
          <div className="flex items-center gap-1.5">
            {item.is_featured && !item.is_breaking && <Star size={11} className="text-gold" fill="#FFD700" />}
            {item.category_name && (
              <span className="font-display text-[10px] uppercase tracking-wider text-gray-500">
                {item.category_icon} {item.category_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ClubBadge name={item.from_club} logoUrl={item.from_club_logo_url} side="from" />
          <div className="flex flex-col items-center gap-2 min-w-0 px-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/10 to-emerald/10 border border-white/10 overflow-hidden flex items-center justify-center">
              {item.player_photo_url ? (
                <img src={item.player_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-base text-gold/70 uppercase">
                  {item.player_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <ArrowRightLeft size={12} className="text-gold/80" />
          </div>
          <ClubBadge name={item.to_club} logoUrl={item.to_club_logo_url} side="to" />
        </div>
        <h3 className="mt-3 font-display text-[15px] font-bold leading-snug text-white group-hover:text-gold transition-colors text-center">
          {item.player_name}
        </h3>
        {item.summary && (
          <p className="mt-1.5 text-[12px] font-body text-gray-400 leading-snug line-clamp-2 text-center">
            {item.summary}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2 text-[11px] font-body">
          <ReliabilityMeter value={item.reliability} />
          {item.fee ? (
            <span className="font-mono text-gold/80 text-[12px] font-semibold">{item.fee}</span>
          ) : (
            <span className="text-gray-600 italic">Fee TBD</span>
          )}
        </div>
        {item.source && (
          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-body text-gray-500">
            via <span className="text-gray-400">{item.source}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function TransferDetailModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const pill = STATUS_PILL[item.transfer_status] || STATUS_PILL.rumor;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-2xl bg-navy border border-white/10 sm:rounded-2xl shadow-2xl shadow-black/60 my-0 sm:my-8 min-h-screen sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-navy/95 backdrop-blur-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.15em] border ${pill.cls}`}>
              {pill.label}
            </span>
            {item.is_breaking && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.15em] bg-red-500/10 text-red-300 border border-red-500/30">
                <Flame size={10} /> Breaking
              </span>
            )}
            <span className="font-display text-[10px] uppercase tracking-wider text-gray-500 truncate">
              {item.category_icon} {item.category_name}
            </span>
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

        <div className="px-5 sm:px-8 py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/15 to-emerald/15 border border-white/15 overflow-hidden flex items-center justify-center">
              {item.player_photo_url ? (
                <img src={item.player_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-gold/70 uppercase">
                  {item.player_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white text-center">
              {item.player_name}
            </h2>
            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full">
              <ClubBadge name={item.from_club} logoUrl={item.from_club_logo_url} side="from" />
              <ArrowRightLeft size={18} className="text-gold mt-3" />
              <ClubBadge name={item.to_club} logoUrl={item.to_club_logo_url} side="to" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="font-display text-[9px] uppercase tracking-wider text-gray-500 mb-1">Fee</div>
              <div className="font-mono text-sm text-gold">{item.fee || '—'}</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="font-display text-[9px] uppercase tracking-wider text-gray-500 mb-1">Contract</div>
              <div className="font-body text-sm text-white">{item.contract_length || '—'}</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col items-center justify-center">
              <div className="font-display text-[9px] uppercase tracking-wider text-gray-500 mb-1">Reliability</div>
              <ReliabilityMeter value={item.reliability} />
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="font-display text-[9px] uppercase tracking-wider text-gray-500 mb-1">Source</div>
              <div className="font-body text-sm text-white truncate">{item.source || '—'}</div>
            </div>
          </div>

          {item.summary && (
            <p className="mt-6 text-sm font-body text-gray-300 leading-relaxed">{item.summary}</p>
          )}

          {item.body && (
            <div className="mt-4 text-[14px] font-body text-gray-300 leading-relaxed whitespace-pre-wrap">
              {item.body}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 text-[11px] text-gray-500 font-body">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {item.published_at ? new Date(item.published_at).toLocaleString() : ''}
            </span>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold/80 hover:text-gold"
              >
                Original report <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransferHub({ navigate, sportSlug }) {
  const { categories } = useAppData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState(null);
  // 'all' or a category slug. URL drives the initial value; clicking a chip
  // updates both state and URL so links to /transfers/<slug> stay shareable.
  const activeSlug = sportSlug || 'all';

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = activeSlug === 'all'
      ? 'page_size=100'
      : `category__slug=${encodeURIComponent(activeSlug)}&page_size=100`;
    api.transfers.list(params)
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        setItems(list);
      })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activeSlug]);

  // For the chip bar we want every sport, but we badge each with its
  // published-transfer count so editors / fans can scan availability.
  const sportTabs = useMemo(() => {
    const counts = {};
    items.forEach((i) => {
      const k = i.category_slug || '__none__';
      counts[k] = (counts[k] || 0) + 1;
    });
    return categories.map((c) => ({ ...c, count: counts[c.slug] || 0 }));
  }, [items, categories]);

  // When viewing "all", group by sport for an editorial layout that mirrors
  // the homepage navigation. When viewing a single sport, group instead by
  // transfer status so readers see the "here we go" / "agreed" beats clustered.
  const grouped = useMemo(() => {
    if (activeSlug === 'all') {
      const order = [];
      const buckets = {};
      for (const it of items) {
        const key = it.category_name || 'Other';
        if (!(key in buckets)) { buckets[key] = { name: key, icon: it.category_icon, slug: it.category_slug, items: [] }; order.push(key); }
        buckets[key].items.push(it);
      }
      return order.map((k) => buckets[k]);
    }
    // Per-sport view → bucket by transfer_status (here_we_go, agreed, …)
    const order = [];
    const buckets = {};
    for (const it of items) {
      const key = (STATUS_PILL[it.transfer_status]?.label) || 'Other';
      if (!(key in buckets)) { buckets[key] = { name: key, items: [] }; order.push(key); }
      buckets[key].items.push(it);
    }
    return order.map((k) => buckets[k]);
  }, [items, activeSlug]);

  const activeCategory = activeSlug === 'all' ? null : categories.find((c) => c.slug === activeSlug);

  return (
    <section className="min-h-screen bg-navy">
      <div
        className="relative px-4 sm:px-8 pt-28 sm:pt-32 pb-10 border-b border-white/[0.05]"
        style={{
          backgroundImage: activeCategory?.cover_url
            ? `linear-gradient(135deg, ${activeCategory.color || '#0f1f3a'}aa 0%, ${activeCategory.color || '#0f1f3a'}33 50%, rgba(15,31,58,0.95) 100%), url(${activeCategory.cover_url})`
            : 'linear-gradient(135deg, rgba(255,215,0,0.10) 0%, rgba(0,168,107,0.06) 60%, rgba(15,31,58,0.95) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          <button type="button" onClick={() => navigate('')}
            className="inline-flex items-center gap-1 text-[11px] font-display uppercase tracking-wider text-white/70 hover:text-gold mb-3">
            <ChevronLeft size={13} /> Back home
          </button>
          <div className="flex items-center gap-3 mb-2">
            <ArrowRightLeft size={28} className="text-gold" />
            <h1 className="font-display text-2xl sm:text-4xl font-bold uppercase tracking-wider text-white">
              {activeCategory ? (
                <>
                  <span>{activeCategory.icon} {activeCategory.name}</span>
                  <span className="text-gold/60 mx-2">·</span>
                </>
              ) : null}
              <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Transfer Centre</span>
            </h1>
          </div>
          <p className="text-gray-200 font-body max-w-2xl drop-shadow">
            Every rumour, agreement, and confirmed signing across {activeCategory ? activeCategory.name.toLowerCase() : 'every sport we cover'}. Filter by sport, drill into the detail of any move, and follow the source attributions back to the original reporter.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        {/* Sport-filter chip bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <Filter size={12} className="text-gray-600 shrink-0" />
          <button
            type="button"
            onClick={() => navigate('transfers')}
            className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all ${
              activeSlug === 'all'
                ? 'bg-gold/10 text-gold border-gold/40'
                : 'text-gray-400 border-white/10 hover:text-white hover:border-white/30'
            }`}
          >
            All sports
            <span className="ml-1.5 text-[10px] text-gray-500 font-mono">{items.length}</span>
          </button>
          {sportTabs.map((c) => {
            const active = c.slug === activeSlug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => navigate(`transfers/${c.slug}`)}
                className={`shrink-0 px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider border transition-all inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-gold/10 text-gold border-gold/40'
                    : 'text-gray-400 border-white/10 hover:text-white hover:border-white/30'
                }`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
                {c.count > 0 && (
                  <span className="text-[10px] text-gray-500 font-mono">{c.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gold/60" />
          </div>
        ) : !items.length ? (
          <div className="rounded-xl border border-white/[0.05] bg-navy-100/30 p-12 text-center">
            <ArrowRightLeft size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-body">
              No transfer items {activeCategory ? `in ${activeCategory.name} ` : ''}yet.
            </p>
            <p className="text-gray-600 font-body text-sm mt-1">
              Editors will surface them here as soon as they're filed.
            </p>
            {activeSlug !== 'all' && (
              <button
                type="button"
                onClick={() => navigate('transfers')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gold/40 hover:bg-gold/5 text-gold font-display text-[11px] uppercase tracking-wider"
              >
                <ArrowLeft size={12} /> All sports
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((g) => (
              <div key={g.name}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-5 rounded-full bg-gold/60" />
                  <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.15em] text-white">
                    {g.icon && <span className="mr-1.5">{g.icon}</span>}
                    {g.name}
                  </h2>
                  <span className="font-display text-[10px] uppercase tracking-wider text-gray-500">
                    {g.items.length} {g.items.length === 1 ? 'item' : 'items'}
                  </span>
                  {g.slug && activeSlug === 'all' && (
                    <button
                      type="button"
                      onClick={() => navigate(`transfers/${g.slug}`)}
                      className="ml-auto text-[11px] font-display uppercase tracking-wider text-gold/70 hover:text-gold inline-flex items-center gap-1"
                    >
                      Full feed <ChevronLeft size={12} className="rotate-180" />
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {g.items.map((item) => (
                    <TransferCard key={item.id} item={item} onOpen={(it) => {
                      trackEvent('transfer_open', { targetType: 'transfer', targetId: it.id, targetLabel: it.player_name });
                      setOpenItem(it);
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openItem && <TransferDetailModal item={openItem} onClose={() => setOpenItem(null)} />}
    </section>
  );
}
