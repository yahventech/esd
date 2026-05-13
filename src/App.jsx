// EASD — App Root
// Assembles all landing page sections in editorial flow order.
// Heavy admin / detail bundles are lazy-loaded so first-paint stays lean.

import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import BreakingNewsTicker from './components/BreakingNewsTicker';
import Hero from './components/Hero';
import LiveScores from './components/LiveScores';
import MatchResults from './components/MatchResults';
import FeaturedStories from './components/FeaturedStories';
import SportCategories from './components/SportCategories';
import VideoHighlights from './components/VideoHighlights';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import BackendStatus from './components/BackendStatus';
import SportSection from './components/SportSection';
import StoryListPage from './components/StoryListPage';
import TrendingStrip from './components/TrendingStrip';
import { useAuth } from './context/AuthContext';
import { isStaffRole } from './lib/api';
import { useRoute } from './hooks/useRoute';

// The admin dashboard is a sizeable subtree (10 managers + forms). Only
// staff users open it, so we defer the chunk entirely until they do.
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));

export default function App() {
  const [route, navigate] = useRoute();
  const { user, adminOpen } = useAuth();
  const showAdmin = adminOpen && isStaffRole(user);

  return (
    <div className="min-h-screen bg-navy">
      <Navbar route={route} navigate={navigate} />
      <BreakingNewsTicker />
      {route.type === 'section' || route.type === 'category' ? (
        <SportSection
          categorySlug={route.categorySlug}
          sectionSlug={route.sectionSlug || ''}
          navigate={navigate}
        />
      ) : route.type === 'gossip' ? (
        <StoryListPage
          key={`gossip-${route.sportSlug || 'all'}`}
          title="Gossip"
          accent="from-fuchsia-400 to-rose-400"
          subtitle="The whispers, the rumours, the talk of the dressing room — every sport, all in one place."
          filterParams="story_format=gossip"
          initialCategorySlug={route.sportSlug || null}
          emptyMessage="No gossip filed yet. Editors will be along shortly."
        />
      ) : route.type === 'opinion' ? (
        <StoryListPage
          key={`opinion-${route.sportSlug || 'all'}`}
          title="Opinion"
          accent="from-amber-300 to-gold"
          subtitle="Columns, takes, and arguments from across the East African sporting beat."
          filterParams="story_format=opinion"
          initialCategorySlug={route.sportSlug || null}
          emptyMessage="No opinion pieces published yet."
        />
      ) : route.type === 'tag' && route.tagSlug ? (
        <StoryListPage
          key={`tag-${route.tagSlug}`}
          title={`#${route.tagSlug.replace(/-/g, ' ')}`}
          accent="from-gold to-emerald"
          subtitle="Every story filed under this hashtag."
          filterParams={`tags__slug=${encodeURIComponent(route.tagSlug)}`}
          trendingSlug={route.tagSlug}
          emptyMessage="Nothing tagged here yet."
        />
      ) : (
        <>
          <div id="home">
            <Hero />
          </div>
          <div id="live-scores">
            <LiveScores />
          </div>
          <div id="results">
            <MatchResults />
          </div>
          <div id="top-stories">
            <FeaturedStories />
          </div>
          <div id="trending">
            <TrendingStrip />
          </div>
          <div id="sports">
            <SportCategories />
          </div>
          <div id="highlights">
            <VideoHighlights />
          </div>
          <div id="newsletter">
            <Newsletter />
          </div>
        </>
      )}
      <Footer />
      <AuthModal />
      {showAdmin && (
        <Suspense fallback={null}>
          <AdminDashboard />
        </Suspense>
      )}
      <BackendStatus />
    </div>
  );
}
