// EASD Component — Navbar
// ESPN-inspired sticky navigation with sport category tabs, search, and live indicator

import { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, ChevronDown } from 'lucide-react';
import { navCategories } from '../data/categories';
import { scrollToSection } from '../utils/helpers';

const navSectionMap = {
  Home: 'home',
  Football: 'top-stories',
  Athletics: 'top-stories',
  Rugby: 'top-stories',
  Basketball: 'top-stories',
};

const moreLinks = [
  { label: 'Live Scores', sectionId: 'live-scores' },
  { label: 'Explore Sports', sectionId: 'sports' },
  { label: 'Highlights', sectionId: 'highlights' },
  { label: 'Newsletter', sectionId: 'newsletter' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const handleNavClick = (link) => {
    setActiveTab(link);
    setMoreOpen(false);
    scrollToSection(navSectionMap[link] || 'top-stories');
  };

  const handleMoreClick = (sectionId) => {
    setMoreOpen(false);
    setMobileOpen(false);
    scrollToSection(sectionId);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-navy/90 backdrop-blur-xl shadow-2xl shadow-black/30 border-b border-gold/10'
          : 'bg-transparent'
      }`}
    >
      {/* Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('Home');
              setMobileOpen(false);
              setMoreOpen(false);
              scrollToSection('home');
            }}
            className="flex items-center gap-3 group"
          >
            <div className="relative">
              <span className="font-display text-2xl sm:text-[28px] font-bold tracking-[0.08em] bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
                EASD
              </span>
              <div className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-gradient-to-r from-gold via-gold/60 to-transparent" />
            </div>
            <div className="hidden xl:flex flex-col leading-none">
              <span className="text-[9px] font-body font-semibold tracking-[0.2em] uppercase text-gray-400">
                East Africa
              </span>
              <span className="text-[9px] font-body font-semibold tracking-[0.2em] uppercase text-gray-500">
                Sports Desk
              </span>
            </div>
          </button>

          {/* Desktop nav links — ESPN-style horizontal tabs */}
          <div className="hidden md:flex items-center h-full relative" ref={moreMenuRef}>
            {navCategories.map((link) => (
              <button
                type="button"
                key={link}
                onClick={() => handleNavClick(link)}
                className={`relative h-full px-4 lg:px-5 font-display text-[13px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  activeTab === link
                    ? 'text-gold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {link}
                {/* Active underline */}
                {activeTab === link && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gold rounded-full" />
                )}
              </button>
            ))}
            <button
              type="button"
              className="h-full px-4 font-display text-[13px] font-medium uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-controls="desktop-more-menu"
            >
              More <ChevronDown size={12} />
            </button>

            {moreOpen && (
              <div
                id="desktop-more-menu"
                className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-white/10 bg-charcoal/95 backdrop-blur-xl shadow-xl shadow-black/40 p-2 z-50"
              >
                {moreLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleMoreClick(item.sectionId)}
                    className="w-full text-left px-3 py-2.5 rounded-lg font-display text-[12px] uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <button
              type="button"
              onClick={() => scrollToSection('top-stories')}
              className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Jump to top stories"
            >
              <Search size={18} />
            </button>

            {/* Live badge — ESPN-style red pulsing indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600/15 border border-red-500/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="font-display text-[11px] font-semibold text-red-400 tracking-wider uppercase">
                Live
              </span>
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              className="md:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        } bg-navy/95 backdrop-blur-xl border-t border-white/5`}
      >
        <div className="px-4 py-3 space-y-1">
          {navCategories.map((link) => (
            <button
              type="button"
              key={link}
              onClick={() => {
                handleNavClick(link);
                setMobileOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider rounded-lg transition-colors ${
                activeTab === link
                  ? 'text-gold bg-gold/5'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {link}
            </button>
          ))}
          {moreLinks.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleMoreClick(item.sectionId)}
              className="block w-full text-left px-4 py-3 font-display text-sm uppercase tracking-wider text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
