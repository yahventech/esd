// EASD Component — Footer
// 4-column footer with social links and gold gradient top border

import { Globe } from 'lucide-react';

const footerSections = {
  About: ['Our Story', 'Editorial Team', 'Careers', 'Advertise With Us', 'Press Kit'],
  Sports: ['Football', 'Athletics', 'Rugby', 'Basketball', 'Boxing', 'Cricket'],
  'Follow Us': [
    { label: 'Twitter / X', icon: '𝕏' },
    { label: 'Instagram', icon: '◎' },
    { label: 'YouTube', icon: '▶' },
    { label: 'Facebook', icon: 'f' },
    { label: 'TikTok', icon: '♪' },
  ],
  Contact: [
    { label: 'info@easportsdesk.com' },
    { label: 'Nairobi, Kenya' },
    { label: '+254 700 000 000' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-navy">
      <div className="h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div>
              <span className="font-display text-2xl font-bold bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent tracking-[0.08em]">
                EASD
              </span>
              <div className="h-[2px] w-10 bg-gradient-to-r from-gold to-transparent mt-1" />
            </div>
            <p className="text-[13px] text-gray-500 font-body leading-relaxed max-w-[200px]">
              The Global Voice of East Africa Sport. Covering every story that matters.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <Globe size={12} />
              <span className="font-body">Available worldwide</span>
            </div>
          </div>

          {/* Columns */}
          {Object.entries(footerSections).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gold/80 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item, i) => {
                  const label = typeof item === 'string' ? item : item.label;
                  const icon = typeof item === 'object' ? item.icon : null;
                  return (
                    <li key={i}>
                      <a href="#" className="group flex items-center gap-2 text-[13px] text-gray-400 hover:text-white transition-colors font-body">
                        {icon && (
                          <span className="flex-shrink-0 w-5 h-5 rounded bg-white/[0.04] flex items-center justify-center text-[10px] text-gray-500 group-hover:text-gold group-hover:bg-gold/10 transition-all">
                            {icon}
                          </span>
                        )}
                        <span>{label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-[11px] text-gray-600 font-body">
            <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
            <span className="text-gray-800">|</span>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <span className="text-gray-800">|</span>
            <a href="#" className="hover:text-gray-400 transition-colors">Cookie Settings</a>
          </div>
          <p className="text-[11px] text-gray-600 font-body text-center sm:text-right">
            © 2025 East Africa Sports Desk. The Global Voice of East Africa Sport.
          </p>
        </div>
      </div>
    </footer>
  );
}
