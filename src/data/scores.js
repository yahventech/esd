// EASD Data — Live Scores & Fixtures

export const liveScores = [
  {
    id: 'match-1',
    competition: 'AFCON Qualifier',
    home: { name: 'Kenya', flag: '🇰🇪', score: 2 },
    away: { name: 'Cameroon', flag: '🇨🇲', score: 1 },
    status: 'LIVE',
    minute: "78'",
    events: ['⚽ Olunga 45\'', '⚽ Olunga 89\'', '⚽ Aboubakar 67\''],
  },
  {
    id: 'match-2',
    competition: 'AFCON Qualifier',
    home: { name: 'Ethiopia', flag: '🇪🇹', score: 0 },
    away: { name: 'Tanzania', flag: '🇹🇿', score: 0 },
    status: 'LIVE',
    minute: "34'",
    events: [],
  },
  {
    id: 'match-3',
    competition: 'CECAFA Cup',
    home: { name: 'Rwanda', flag: '🇷🇼', score: 3 },
    away: { name: 'Burundi', flag: '🇧🇮', score: 1 },
    status: 'FT',
    minute: '',
    events: ['⚽ Mugisha 12\'', '⚽ Mugisha 56\'', '⚽ Hakizimana 78\'', '⚽ Ndayishimiye 44\''],
  },
  {
    id: 'match-4',
    competition: 'Friendly',
    home: { name: 'Somalia', flag: '🇸🇴', score: null },
    away: { name: 'Djibouti', flag: '🇩🇯', score: null },
    status: 'UPCOMING',
    kickoff: '15:00 EAT',
    minute: '',
    events: [],
  },
  {
    id: 'match-5',
    competition: 'KPL',
    home: { name: 'Gor Mahia', flag: '🟢', score: 2 },
    away: { name: 'AFC Leopards', flag: '🔵', score: 1 },
    status: 'FT',
    minute: '',
    events: ['⚽ Omondi 23\'', '⚽ Otieno 67\'', '⚽ Wafula 81\''],
  },
];

export const videos = [
  {
    id: 'vid-1',
    title: 'Top 10 Goals: East Africa Premier League — Matchday 12',
    duration: '8:24',
    views: '124K',
    category: 'Highlights',
    gradient: 'from-red-900 via-orange-900 to-navy',
  },
  {
    id: 'vid-2',
    title: "Inside Kipchoge's Training Camp: The Final Chapter",
    duration: '12:01',
    views: '89K',
    category: 'Documentary',
    gradient: 'from-emerald-900 via-teal-900 to-navy',
  },
  {
    id: 'vid-3',
    title: "Kenya 7s: Road to the Olympics — Full Documentary",
    duration: '22:15',
    views: '201K',
    category: 'Feature',
    gradient: 'from-blue-900 via-indigo-900 to-navy',
  },
];
