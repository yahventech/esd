// EASD Component — SportCategories
// Horizontal scrollable category pills — ESPN sport selector style

import { useState } from 'react';
import { categories } from '../data/categories';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

export default function SportCategories() {
  const [ref, visible] = useScrollAnimation();
  const [active, setActive] = useState(null);

  return (
    <section className="relative py-10 sm:py-14 bg-charcoal">
      <div
        ref={ref}
        className={`max-w-[1400px] mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-7 rounded-full bg-gradient-to-b from-emerald to-gold" />
          <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
            <span className="bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Explore</span>
            <span className="text-white ml-2">Sports</span>
          </h2>
        </div>

        {/* Category cards — horizontal scroll */}
        <div
          className="flex gap-3 overflow-x-auto pb-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((cat) => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActive(isActive ? null : cat.id)}
                className={`flex-shrink-0 rounded-xl px-5 py-4 min-w-[130px] text-center transition-all duration-300 border ${
                  isActive
                    ? 'border-gold/40 -translate-y-1 shadow-lg shadow-gold/10'
                    : 'border-white/[0.06] hover:border-gold/20 hover:-translate-y-0.5'
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${cat.color}22, ${cat.color}08)`
                    : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="text-3xl mb-2 transition-transform duration-300" style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
                  {cat.icon}
                </div>
                <div className={`font-display text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                  isActive ? 'text-gold' : 'text-gray-300'
                }`}>
                  {cat.name}
                </div>
                <div className={`text-[11px] mt-1 font-body transition-colors ${
                  isActive ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {cat.count} articles
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
