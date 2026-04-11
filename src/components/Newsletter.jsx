// EASD Component — Newsletter
// Premium email signup section with gradient border card

import { useState } from 'react';
import { ArrowRight, Check, Trophy } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

export default function Newsletter() {
  const [ref, visible] = useScrollAnimation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = () => {
    if (email.trim()) setSubscribed(true);
  };

  return (
    <section className="relative py-14 sm:py-24 bg-charcoal">
      <div
        ref={ref}
        className={`max-w-3xl mx-auto px-4 sm:px-6 transition-all duration-700 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Gradient border wrapper */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-emerald/40 via-gold/40 to-emerald/40">
          <div className="relative rounded-2xl overflow-hidden bg-navy p-8 sm:p-12 text-center">
            {/* Texture */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,215,0,1) 60px, rgba(255,215,0,1) 61px)`,
              }}
            />
            <div className="absolute top-0 left-1/4 w-40 h-40 rounded-full bg-emerald/[0.05] blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-40 h-40 rounded-full bg-gold/[0.05] blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gold/10 border border-gold/20 mb-5">
                <Trophy size={24} className="text-gold" />
              </div>

              <h2 className="font-display text-2xl sm:text-4xl font-bold uppercase tracking-wider mb-3">
                <span className="bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">Stay Ahead</span>
                <span className="text-white"> of the Game</span>
              </h2>

              <p className="text-gray-400 font-body text-sm sm:text-base mb-7 max-w-md mx-auto leading-relaxed">
                East Africa's biggest sports stories, exclusive interviews, and match highlights — delivered to your inbox every morning.
              </p>

              {subscribed ? (
                <div className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald/10 border border-emerald/30 text-emerald font-display text-sm font-semibold uppercase tracking-wider">
                  <Check size={18} />
                  You're subscribed — welcome to the team!
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3.5 rounded-xl text-sm font-body text-white placeholder-gray-500 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    onClick={handleSubmit}
                    className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-display text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-gold to-yellow-500 text-navy hover:shadow-lg hover:shadow-gold/25 transition-all hover:-translate-y-0.5"
                  >
                    Subscribe
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              )}

              <p className="mt-4 text-[11px] text-gray-600">Free. No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
