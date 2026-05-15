// EASD Component — TransferNews (home preview)
// Compact homepage strip that teases the transfer window: a handful of summary
// cards, no detail panel. Tapping a card jumps to the originating sport's
// /<slug>/transfers subpage, where the full feed lives alongside scores,
// fixtures, and the rest of the sport hub.

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2, Flame, Star,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAppData } from '../context/AppDataContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

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

function SummaryCard({ item, onClickThrough }) {
  const pill = STATUS_PILL[item.transfer_status] || STATUS_PILL.rumor;
  return (
    <button
      type="button"
      onClick={onClickThrough}
      className={`group flex-shrink-0 w-[260px] sm:w-[280px] text-left rounded-2xl border bg-navy-100/60 backdrop-blur-sm p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        item.is_breaking
          ? 'border-gold/40 shadow-[0_0_24px_-12px_rgba(255,215,0,0.45)] hover:border-gold/70'
          : 'border-white/[0.06] hover:border-gold/30 hover:shadow-gold/[0.08]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-display text-[9px] uppercase tracking-[0.12em] border ${pill.cls}`}>
          {pill.label}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-display uppercase tracking-wider text-gray-500">
          {item.is_breaking && <Flame size={10} className="text-red-400" />}
          {item.is_featured && !item.is_breaking && <Star size={10} className="text-gold" fill="#FFD700" />}
          {item.category_name && <span>{item.category_icon} {item.category_name}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
          {item.player_photo_url ? (
            <img src={item.player_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-[11px] text-gold/70 uppercase">
              {item.player_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-bold text-white group-hover:text-gold transition-colors truncate">
            {item.player_name}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-body text-gray-400 truncate">
            <span className="truncate">{item.from_club || 'Free'}</span>
            <ArrowRightLeft size={9} className="text-gold/70 shrink-0" />
            <span className="truncate">{item.to_club || 'TBD'}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2 text-[11px] font-body">
        <span className="font-mono text-gold/80 text-[11px] font-semibold">
          {item.fee || 'Fee TBD'}
        </span>
        <span className="text-gold/70 inline-flex items-center gap-1 font-display text-[10px] uppercase tracking-wider group-hover:text-gold">
          Open <ArrowRight size={10} />
        </span>
      </div>
    </button>
  );
}

export default function TransferNews({ navigate }) {
  const [ref, visible] = useScrollAnimation();
  const { categories } = useAppData();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stripEl, setStripEl] = useState(null);
  const scroll = (dir) => {
    if (stripEl) stripEl.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Compact homepage preview — pull just the curated 'featured' slice so the
    // hero strip stays tight. The full feed lives behind /transfers.
    api.transfers.featured()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        setItems(list);
      })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Category badges shown next to "View all" — only sports that actually have
  // at least one published transfer item right now.
  const sportsWithItems = useMemo(() => {
    const slugs = new Set(items.map((i) => i.category_slug).filter(Boolean));
    return categories.filter((c) => slugs.has(c.slug));
  }, [items, categories]);

  if (!loading && !items.length) return null;

  // Each card / chip targets its own sport's Transfers subpage. There is no
  // standalone /transfers route any more — each sport hub owns its feed.
  const goToSport = (slug) => {
    if (!slug) return;
    navigate?.(`${slug}/transfers`);
  };

  return (
    <section className="relative py-12 sm:py-16 bg-gradient-to-b from-navy via-charcoal/40 to-navy" id="transfers">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-gold" />
                <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Transfer</span>
                <span className="text-white">Centre</span>
              </h2>
              <p className="text-[12px] font-body text-gray-500 mt-1">
                Headline beats from the window. Tap any card to land on its sport's full transfers page.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll left"
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll right"
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {sportsWithItems.length > 1 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <span className="font-display text-[10px] uppercase tracking-wider text-gray-500 shrink-0 mr-1">
              Jump to:
            </span>
            {sportsWithItems.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => goToSport(c.slug)}
                className="shrink-0 px-3 py-1 rounded-full font-display text-[10px] uppercase tracking-wider border text-gray-400 border-white/10 hover:text-white hover:border-white/30 inline-flex items-center gap-1.5"
                title={`Open ${c.name} transfers`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
                <ArrowRight size={10} className="text-gold/60" />
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={20} className="animate-spin text-gold/60" />
          </div>
        ) : (
          <div
            ref={setStripEl}
            className="flex gap-4 overflow-x-auto pb-3 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((item) => (
              <SummaryCard
                key={item.id}
                item={item}
                onClickThrough={() => goToSport(item.category_slug)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
