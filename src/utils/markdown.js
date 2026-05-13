// EASD Utils — Markdown
// Tiny, dependency-free markdown renderer for story bodies. We deliberately
// keep the dialect small (paragraphs, headings, quotes, lists, bold/italic,
// links, inline code, horizontal rules) so authors get rich formatting without
// the cost of a full markdown engine. All HTML in the source is escaped before
// any transformation, so the output can be safely fed to dangerouslySetInnerHTML.

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPE[c]);

function renderInline(text) {
  // text is already HTML-escaped — we only inject our own tags.
  let s = text;
  // Inline code first so its contents don't get treated as bold/italic.
  s = s.replace(/`([^`\n]+)`/g, (_, code) =>
    `<code class="px-1 py-0.5 rounded bg-white/[0.06] border border-white/10 text-gold/90 text-[0.9em] font-mono">${code}</code>`);
  // Markdown links — text must not include nested brackets.
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, href) => `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-gold underline underline-offset-2 hover:text-yellow-300">${label}</a>`);
  // Bold (**) before italic (*) to avoid partial matches.
  s = s.replace(/\*\*([^*\n][^*\n]*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n][^*\n]*?)\*(?!\*)/g, '$1<em class="italic text-gray-200">$2</em>');
  // Underscore italic — only when bounded by word edges, so words like
  // some_var_name don't get sliced up.
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, '$1<em class="italic text-gray-200">$2</em>');
  return s;
}

export function renderMarkdown(input) {
  if (!input) return '';
  const escaped = escapeHTML(input).replace(/\r\n?/g, '\n');
  // Split into block tokens by blank lines.
  const blocks = escaped.split(/\n{2,}/);
  const out = [];

  for (let raw of blocks) {
    const block = raw.replace(/^\n+|\n+$/g, '');
    if (!block) continue;

    // Horizontal rule
    if (/^---+$/.test(block.trim())) {
      out.push('<hr class="my-6 border-white/10" />');
      continue;
    }

    // Headings — only h2/h3 are supported; the story headline owns h1.
    const heading = block.match(/^(#{1,3})\s+(.*)$/);
    if (heading && !block.includes('\n')) {
      const level = heading[1].length;
      const cls = level === 1
        ? 'font-display text-2xl sm:text-3xl font-bold text-white mt-6 mb-3'
        : level === 2
          ? 'font-display text-xl sm:text-2xl font-bold text-white mt-6 mb-3'
          : 'font-display text-lg font-semibold text-gold mt-5 mb-2 uppercase tracking-wider';
      out.push(`<h${level === 1 ? 2 : level} class="${cls}">${renderInline(heading[2])}</h${level === 1 ? 2 : level}>`);
      continue;
    }

    // Block quote — one or more `> ` lines.
    if (block.split('\n').every((l) => /^>\s?/.test(l))) {
      const inner = block.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ');
      out.push(`<blockquote class="my-5 pl-4 border-l-2 border-gold/40 italic text-gray-200">${renderInline(inner)}</blockquote>`);
      continue;
    }

    // Unordered list — every line begins with - or *.
    if (block.split('\n').every((l) => /^[-*]\s+/.test(l))) {
      const items = block.split('\n').map((l) => `<li class="leading-relaxed">${renderInline(l.replace(/^[-*]\s+/, ''))}</li>`).join('');
      out.push(`<ul class="my-4 ml-5 list-disc text-gray-300 space-y-1.5 marker:text-gold/50">${items}</ul>`);
      continue;
    }

    // Ordered list — every line begins with `N. `.
    if (block.split('\n').every((l) => /^\d+\.\s+/.test(l))) {
      const items = block.split('\n').map((l) => `<li class="leading-relaxed">${renderInline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('');
      out.push(`<ol class="my-4 ml-5 list-decimal text-gray-300 space-y-1.5 marker:text-gold/60 marker:font-display">${items}</ol>`);
      continue;
    }

    // Paragraph — preserve hard line breaks within the paragraph.
    const inline = renderInline(block).replace(/\n/g, '<br />');
    out.push(`<p class="text-[15px] leading-relaxed text-gray-300 mt-4 first:mt-0">${inline}</p>`);
  }

  return out.join('\n');
}
