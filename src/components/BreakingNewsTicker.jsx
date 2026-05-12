// EASD Component — BreakingNewsTicker
// ESPN "Bottom Line" inspired scrolling news ticker, fed by the DRF backend.

import { Zap } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { scrollToSection } from '../utils/helpers';

export default function BreakingNewsTicker() {
  const { breakingNews } = useAppData();
  if (!breakingNews.length) return null;
  const doubled = [...breakingNews, ...breakingNews];

  return (
    <div className="fixed top-14 sm:top-16 left-0 right-0 z-40 bg-charcoal/95 backdrop-blur-sm border-b border-emerald/10 overflow-hidden">
      <div className="flex items-center h-8">
        <div className="relative z-10 flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 h-full bg-red-600 font-display text-[11px] font-bold text-white tracking-[0.15em] uppercase">
          <Zap size={11} className="fill-white" />
          <span className="hidden sm:inline">Breaking</span>
        </div>

        <div className="overflow-hidden flex-1 h-full flex items-center">
          <div className="animate-ticker whitespace-nowrap flex items-center gap-0">
            {doubled.map((item, i) => (
              <span key={i} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => scrollToSection(i % 2 === 0 ? 'top-stories' : 'live-scores')}
                  className="text-[13px] font-body font-medium text-emerald-400/90 hover:text-emerald-300 cursor-pointer transition-colors"
                >
                  {item}
                </button>
                <span className="mx-6 text-gold/40 text-[8px]">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
