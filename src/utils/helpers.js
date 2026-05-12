// EASD Utils — Helpers

export const categoryColorMap = {
  Football: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Athletics: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30' },
  Rugby: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30' },
  Basketball: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30' },
  Boxing: { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-600/30' },
  Cricket: { bg: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-500/30' },
  Cycling: { bg: 'bg-sky-500', text: 'text-sky-400', border: 'border-sky-500/30' },
  Swimming: { bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  Feature: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  Analysis: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
  Opinion: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30' },
  Highlights: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' },
  Documentary: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export function getCategoryBadge(category) {
  return categoryColorMap[category] || { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500/30' };
}

/**
 * Editorial format → visual style + label + symbol.
 * Backed by Story.FORMAT_CHOICES on the API: news, analysis, opinion, interview,
 * feature, match_preview, match_report, live_blog, quick_hit.
 */
const formatStyles = {
  news:          { label: 'News',         symbol: '',   text: 'text-gray-200',   bg: 'bg-white/5',            border: 'border-white/10' },
  analysis:      { label: 'Analysis',     symbol: '🧠', text: 'text-sky-300',    bg: 'bg-sky-500/10',         border: 'border-sky-500/30' },
  opinion:       { label: 'Opinion',      symbol: '💬', text: 'text-purple-300', bg: 'bg-purple-500/10',      border: 'border-purple-500/30' },
  interview:     { label: 'Interview',    symbol: '🎙', text: 'text-amber-300',  bg: 'bg-amber-500/10',       border: 'border-amber-500/30' },
  feature:       { label: 'Feature',      symbol: '✨', text: 'text-gold',       bg: 'bg-gold/10',            border: 'border-gold/30' },
  match_preview: { label: 'Match Preview',symbol: '🔍', text: 'text-teal-300',   bg: 'bg-teal-500/10',        border: 'border-teal-500/30' },
  match_report:  { label: 'Match Report', symbol: '📝', text: 'text-emerald-300',bg: 'bg-emerald-500/10',     border: 'border-emerald-500/30' },
  live_blog:     { label: 'Live Blog',    symbol: '🔴', text: 'text-red-300',    bg: 'bg-red-500/10',         border: 'border-red-500/30' },
  quick_hit:     { label: 'Quick Hit',    symbol: '⚡', text: 'text-yellow-300', bg: 'bg-yellow-500/10',      border: 'border-yellow-500/30' },
};

export function getFormatBadge(format) {
  return formatStyles[format] || null;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function scrollToSection(sectionId, topOffset = 104) {
  if (typeof window === 'undefined') return;

  const target = document.getElementById(sectionId);
  if (!target) return;

  const targetTop = target.getBoundingClientRect().top + window.scrollY - topOffset;
  window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
}
