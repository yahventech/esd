// EASD — App Root
// Assembles all landing page sections in editorial flow order

import Navbar from './components/Navbar';
import BreakingNewsTicker from './components/BreakingNewsTicker';
import Hero from './components/Hero';
import LiveScores from './components/LiveScores';
import FeaturedStories from './components/FeaturedStories';
import SportCategories from './components/SportCategories';
import VideoHighlights from './components/VideoHighlights';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <BreakingNewsTicker />
      <div id="home">
        <Hero />
      </div>
      <div id="live-scores">
        <LiveScores />
      </div>
      <div id="top-stories">
        <FeaturedStories />
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
      <Footer />
    </div>
  );
}
