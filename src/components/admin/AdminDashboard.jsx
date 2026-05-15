// EASD Admin Dashboard — tabbed shell that composes every manager.

import { useMemo, useState } from 'react';
import {
  FileText, Video as VideoIcon, Flag, Zap, TrendingUp,
  Layers, Shield, UserCog, X, LogOut, Compass,
  Users as UsersIcon, BarChart3, ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { isStaffRole } from '../../lib/api';
import { Toast, useToast } from './shared';
import StoriesManager from './StoriesManager';
import VideosManager from './VideosManager';
import MatchesManager from './MatchesManager';
import BreakingNewsManager from './BreakingNewsManager';
import TrendingManager from './TrendingManager';
import TransfersManager from './TransfersManager';
import CategoriesManager from './CategoriesManager';
import SectionsManager from './SectionsManager';
import TeamsManager from './TeamsManager';
import PlayersManager from './PlayersManager';
import StatsManager from './StatsManager';
import UsersManager from './UsersManager';

const TABS = [
  { id: 'stories',    label: 'Stories',    icon: FileText,   roles: ['author', 'editor', 'admin'] },
  { id: 'videos',     label: 'Videos',     icon: VideoIcon,  roles: ['editor', 'admin'] },
  { id: 'matches',    label: 'Matches',    icon: Flag,       roles: ['editor', 'admin'] },
  { id: 'teams',      label: 'Teams',      icon: Shield,     roles: ['editor', 'admin'] },
  { id: 'players',    label: 'Players',    icon: UsersIcon,  roles: ['editor', 'admin'] },
  { id: 'stats',      label: 'Stats',      icon: BarChart3,  roles: ['editor', 'admin'] },
  { id: 'breaking',   label: 'Breaking',   icon: Zap,        roles: ['editor', 'admin'] },
  { id: 'transfers',  label: 'Transfers',  icon: ArrowRightLeft, roles: ['editor', 'admin'] },
  { id: 'trending',   label: 'Trending',   icon: TrendingUp, roles: ['editor', 'admin'] },
  { id: 'categories', label: 'Categories', icon: Layers,     roles: ['editor', 'admin'] },
  { id: 'sections',   label: 'Sub-pages',  icon: Compass,    roles: ['editor', 'admin'] },
  { id: 'users',      label: 'Users',      icon: UserCog,    roles: ['admin'] },
];

export default function AdminDashboard() {
  const { user, logout, adminOpen, setAdminOpen } = useAuth();
  const { reload } = useAppData();
  const toast = useToast();

  const visibleTabs = useMemo(() => {
    if (!user) return [];
    if (user.is_staff || user.role === 'admin') return TABS;
    return TABS.filter((t) => t.roles.includes(user.role));
  }, [user]);

  const [tab, setTab] = useState(() => visibleTabs[0]?.id || 'stories');

  if (!adminOpen) return null;
  if (!user || !isStaffRole(user)) return null;

  const managerProps = {
    showToast: toast,
    onDataChanged: reload,
    currentUser: user,
  };

  const renderTab = () => {
    switch (tab) {
      case 'stories':    return <StoriesManager {...managerProps} />;
      case 'videos':     return <VideosManager {...managerProps} />;
      case 'matches':    return <MatchesManager {...managerProps} />;
      case 'teams':      return <TeamsManager {...managerProps} />;
      case 'players':    return <PlayersManager {...managerProps} />;
      case 'stats':      return <StatsManager {...managerProps} />;
      case 'breaking':   return <BreakingNewsManager {...managerProps} />;
      case 'transfers':  return <TransfersManager {...managerProps} />;
      case 'trending':   return <TrendingManager {...managerProps} />;
      case 'categories': return <CategoriesManager {...managerProps} />;
      case 'sections':   return <SectionsManager {...managerProps} />;
      case 'users':      return <UsersManager {...managerProps} />;
      default:           return <StoriesManager {...managerProps} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-navy flex flex-col">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14 border-b border-white/10 bg-navy/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/easd-logo-light.svg" alt="EASD" className="h-8 w-auto" />
          <span className="font-display text-[11px] uppercase tracking-[0.2em] text-gold/70 border-l border-white/10 pl-3">Admin</span>
          <span className="hidden sm:inline text-[11px] font-display uppercase tracking-wider text-gray-500">
            · {user.display_name || user.username} · <span className="text-gold/70">{user.role}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={logout}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-display uppercase tracking-wider text-gray-400 hover:text-white hover:border-white/30">
            <LogOut size={12} /> Sign out
          </button>
          <button type="button" onClick={() => setAdminOpen(false)}
            aria-label="Close admin"
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 bg-navy-100/30 py-4 gap-0.5 overflow-y-auto">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`mx-2 px-3 py-2 rounded-lg flex items-center gap-2.5 text-left font-display text-[12px] uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-gold/10 text-gold border border-gold/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="md:hidden flex gap-1 overflow-x-auto px-3 py-3 border-b border-white/5 bg-navy-100/30">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-display text-[11px] uppercase tracking-wider ${
                    active ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gray-400 border border-white/10'
                  }`}>
                  <Icon size={12} /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
            {renderTab()}
          </div>
        </main>
      </div>

      <Toast toast={toast.toast} onClose={toast.clearToast} />
    </div>
  );
}
