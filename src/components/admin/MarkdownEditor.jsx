// EASD Admin — MarkdownEditor
// Lightweight textarea + formatting toolbar. Inserts plain markdown into the
// underlying string, so the persisted body stays portable. A live preview pane
// reuses the same renderMarkdown the reader uses, so what authors see here is
// what readers will see.

import { useRef, useState } from 'react';
import { Bold, Italic, Heading2, Quote, List, ListOrdered, Link as LinkIcon, Eye, Pencil, Minus } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdown';

function wrapSelection(textarea, before, after = before, placeholder = 'text') {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const caret = start + before.length + selected.length + after.length;
  return { next, caret };
}

function prefixLines(textarea, prefix) {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = end + (value.slice(end).indexOf('\n') === -1 ? value.slice(end).length : value.slice(end).indexOf('\n'));
  const block = value.slice(lineStart, lineEnd);
  const lines = (block || prefix.replace(/\s+$/, '') + 'item').split('\n');
  const prefixed = lines.map((l) => (l.startsWith(prefix) ? l : `${prefix}${l}`)).join('\n');
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { next, caret: lineStart + prefixed.length };
}

export default function MarkdownEditor({ value, onChange, rows = 10, placeholder }) {
  const ref = useRef(null);
  const [mode, setMode] = useState('write');

  const apply = (kind) => {
    const ta = ref.current;
    if (!ta) return;
    ta.focus();
    let res;
    switch (kind) {
      case 'bold':       res = wrapSelection(ta, '**', '**', 'bold text'); break;
      case 'italic':     res = wrapSelection(ta, '*', '*', 'italic text'); break;
      case 'h2':         res = prefixLines(ta, '## '); break;
      case 'quote':      res = prefixLines(ta, '> '); break;
      case 'ul':         res = prefixLines(ta, '- '); break;
      case 'ol':         res = prefixLines(ta, '1. '); break;
      case 'hr': {
        const v = ta.value;
        const s = ta.selectionStart;
        const insert = (s > 0 && v[s - 1] !== '\n' ? '\n\n' : '') + '---\n\n';
        res = { next: v.slice(0, s) + insert + v.slice(s), caret: s + insert.length };
        break;
      }
      case 'link': {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || 'link text';
        const url = window.prompt('URL', 'https://');
        if (!url) return;
        const insert = `[${sel}](${url})`;
        res = {
          next: ta.value.slice(0, ta.selectionStart) + insert + ta.value.slice(ta.selectionEnd),
          caret: ta.selectionStart + insert.length,
        };
        break;
      }
      default: return;
    }
    onChange(res.next);
    queueMicrotask(() => {
      ta.focus();
      ta.setSelectionRange(res.caret, res.caret);
    });
  };

  const btn = 'p-1.5 rounded text-gray-400 hover:text-gold hover:bg-white/[0.06] transition-colors';

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] focus-within:border-gold/40 focus-within:ring-1 focus-within:ring-gold/20 transition-all overflow-hidden">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-white/[0.06] bg-white/[0.02]">
        <button type="button" className={btn} onClick={() => apply('bold')} title="Bold (**text**)"><Bold size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('italic')} title="Italic (*text*)"><Italic size={13} /></button>
        <span className="w-px h-4 bg-white/10 mx-0.5" />
        <button type="button" className={btn} onClick={() => apply('h2')} title="Heading (## …)"><Heading2 size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('quote')} title="Quote (> …)"><Quote size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('ul')} title="Bulleted list (- …)"><List size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('ol')} title="Numbered list (1. …)"><ListOrdered size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('link')} title="Link"><LinkIcon size={13} /></button>
        <button type="button" className={btn} onClick={() => apply('hr')} title="Horizontal rule (---)"><Minus size={13} /></button>
        <div className="ml-auto inline-flex rounded border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display uppercase tracking-wider ${
              mode === 'write' ? 'bg-gold/15 text-gold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Pencil size={11} /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-display uppercase tracking-wider ${
              mode === 'preview' ? 'bg-gold/15 text-gold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={11} /> Preview
          </button>
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          ref={ref}
          rows={rows}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Write the story body…\n\n**Bold**, *italic*, > quotes, ## subheadings, - bullet lists, [links](https://example.com).'}
          className="w-full px-3 py-3 text-sm font-body text-white placeholder-gray-600 outline-none bg-transparent resize-y leading-relaxed"
        />
      ) : (
        <div className="px-4 py-4 min-h-[160px] story-body text-gray-300 font-body leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: (value || '').trim()
            ? renderMarkdown(value)
            : '<p class="text-gray-600 italic">Nothing to preview yet.</p>' }}
        />
      )}
    </div>
  );
}
