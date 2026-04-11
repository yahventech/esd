// EASD Data — Stories
// Rich editorial content for Featured, Top, and Trending story components

export const heroStory = {
  id: 'hero-1',
  category: 'Football',
  headline: 'Harambee Stars Clinch Historic AFCON Qualification with Last-Minute Winner',
  summary:
    "A Michael Olunga brace, capped by a 89th-minute header, sends Kenya to the Africa Cup of Nations for the first time in five years. Over 60,000 fans at Kasarani erupt as the final whistle seals a 2-1 victory over Cameroon.",
  author: 'James Ochieng',
  authorRole: 'Senior Football Correspondent',
  timestamp: '2 hours ago',
  readTime: '5 min read',
  commentCount: 342,
  isLive: true,
};

export const featuredStories = [
  {
    id: 'feat-1',
    category: 'Athletics',
    headline: "Kipchoge Announces 2026 World Championships Comeback After 14-Month Hiatus",
    summary: 'The marathon GOAT targets one final glory at the Tokyo World Championships, ending months of retirement speculation.',
    author: 'Mary Wanjiku',
    timestamp: '4 hours ago',
    readTime: '3 min read',
    commentCount: 218,
    gradient: 'from-amber-900/80 via-orange-900/60 to-navy',
  },
  {
    id: 'feat-2',
    category: 'Rugby',
    headline: 'Kenya 7s Name Explosive Young Squad for Hong Kong Sevens',
    summary: 'Shujaa bet on speed and youth with four uncapped players in the 13-man travelling party.',
    author: 'Brian Tito',
    timestamp: '5 hours ago',
    readTime: '4 min read',
    commentCount: 87,
    gradient: 'from-emerald-900/80 via-teal-900/60 to-navy',
  },
  {
    id: 'feat-3',
    category: 'Basketball',
    headline: "South Sudan's Basketball Rise Continues — Three Players Projected First-Round NBA Picks",
    summary: 'The youngest nation in the world keeps producing basketball talent at an unprecedented rate.',
    author: 'Achol Deng',
    timestamp: '6 hours ago',
    readTime: '6 min read',
    commentCount: 156,
    gradient: 'from-blue-900/80 via-indigo-900/60 to-navy',
  },
];

export const topStories = [
  {
    id: 'top-1',
    category: 'Football',
    headline: 'Gor Mahia Confirm Record-Breaking Simba SC Striker Signing',
    timestamp: '3 hours ago',
    commentCount: 127,
  },
  {
    id: 'top-2',
    category: 'Athletics',
    headline: "Faith Kipyegon Sets Sights on Unprecedented 5000m World Record",
    timestamp: '5 hours ago',
    commentCount: 94,
  },
  {
    id: 'top-3',
    category: 'Football',
    headline: 'CECAFA U-20: Tanzania Stun Uganda with Stoppage-Time Equalizer',
    timestamp: '7 hours ago',
    commentCount: 63,
  },
  {
    id: 'top-4',
    category: 'Boxing',
    headline: 'Conjestina Achieng Documentary Breaks Kenyan Streaming Records',
    timestamp: '8 hours ago',
    commentCount: 201,
  },
  {
    id: 'top-5',
    category: 'Cricket',
    headline: 'Kenya Cricket Board Announce Historic Test Match Bid for 2028',
    timestamp: '9 hours ago',
    commentCount: 42,
  },
];

export const breakingNewsItems = [
  "Ethiopia's Tigist Assefa shatters world record at Berlin Marathon — 2:09:36",
  'TRANSFER: Gor Mahia confirm Simba SC striker for club-record fee',
  'Uganda Cranes leading DR Congo 1-0 at half time — World Cup Qualifier LIVE',
  'Rwanda awarded hosting rights for 2027 African Games',
  'Ferdinand Omanyala cleared for Olympic relay squad after injury scare',
  'South Sudan basketball — three projected NBA first-round draft picks',
  'Tusker FC edge AFC Leopards 2-1 in Nairobi derby thriller',
];

export const trendingTopics = [
  { tag: '#AFCON2026', count: '12.4K' },
  { tag: '#Olunga', count: '8.7K' },
  { tag: '#KenyaVsCameroon', count: '6.2K' },
  { tag: '#Kipchoge', count: '5.1K' },
  { tag: '#Shujaa7s', count: '3.8K' },
];

export const editorsPicks = [
  {
    id: 'ep-1',
    category: 'Feature',
    headline: "The Kipchoge Effect: How One Man Transformed East African Marathon Culture",
    readTime: '12 min read',
    type: 'longform',
  },
  {
    id: 'ep-2',
    category: 'Analysis',
    headline: 'Tactical Breakdown: How Kenya Neutralized Cameroon\'s Wing Play',
    readTime: '8 min read',
    type: 'analysis',
  },
  {
    id: 'ep-3',
    category: 'Opinion',
    headline: "It's Time African Football Took the Transfer Market Seriously",
    readTime: '6 min read',
    type: 'opinion',
  },
];
