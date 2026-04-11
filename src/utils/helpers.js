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
