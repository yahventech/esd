// EASD Component — StoryReader
// Full-page modal that loads a story, its comments, and lets logged-in users
// comment + bookmark via the DRF backend.

import { useEffect, useRef, useState } from 'react';
import { X, MessageSquare, Clock, Bookmark as BookmarkIcon, ThumbsUp, Loader2, Send, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useInteractionGate, FREE_LIMIT } from '../hooks/useInteractionGate';
import { getCategoryBadge, getFormatBadge } from '../utils/helpers';
import { renderMarkdown } from '../utils/markdown';

export default function StoryReader({ story, onClose }) {
  const { user, openAuth } = useAuth();
  const gate = useInteractionGate();
  const consumedRef = useRef(false);
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [draft, setDraft] = useState('');

  const badge = getCategoryBadge(story.category);
  const fmt = getFormatBadge(detail?.format || story.format);
  const tags = Array.isArray(detail?.tags) ? detail.tags : (Array.isArray(story.tags) ? story.tags : []);

  // Charge the interaction once per opened story. If the visitor is past the
  // free-reads limit, consume() opens the signup modal and we close the reader
  // before fetching anything — keeps the gate honest without ever showing the
  // article body to gated guests.
  useEffect(() => {
    if (consumedRef.current) return;
    consumedRef.current = true;
    const ok = gate.consume();
    if (!ok) {
      onClose?.();
    }
  }, [gate, onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [d, c] = await Promise.all([
          api.stories.detail(story.slug),
          api.stories.comments(story.slug),
        ]);
        if (!alive) return;
        setDetail(d);
        setComments(c || []);
        if (user) {
          try {
            const s = await api.stories.bookmarkStatus(story.slug);
            setBookmarked(Boolean(s?.bookmarked));
          } catch { /* anon */ }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [story.slug, user]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) { openAuth('login'); return; }
    if (!draft.trim()) return;
    try {
      const c = await api.stories.addComment(story.slug, draft.trim());
      setComments((cs) => [c, ...cs]);
      setDraft('');
    } catch (e2) {
      alert(e2.message || 'Failed to post comment');
    }
  };

  const toggleBookmark = async () => {
    if (!user) { openAuth('login'); return; }
    setSaving(true);
    try {
      const res = await api.stories.bookmarkToggle(story.slug);
      setBookmarked(Boolean(res?.bookmarked));
    } finally {
      setSaving(false);
    }
  };

  const likeComment = async (c) => {
    if (!user) { openAuth('login'); return; }
    try {
      const res = await api.comments.like(c.id);
      setComments((cs) => cs.map((x) => x.id === c.id
        ? { ...x, liked_by_me: res.liked, like_count: res.like_count }
        : x));
    } catch { /* ignore */ }
  };

  const body = detail?.body || story.summary || '';
  const bodyHTML = body.trim() ? renderMarkdown(body) : '';

  return (
    <div className="fixed inset-0 z-[95] flex items-stretch sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-6"
      onClick={onClose}>
      <div
        className="relative w-full max-w-3xl bg-navy border border-white/10 rounded-none sm:rounded-2xl shadow-2xl shadow-black/70 flex flex-col h-full sm:h-auto sm:max-h-[92svh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/40 text-gray-400 hover:text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Scrollable content area — the panel itself stays fixed-height so the
            scroll is smooth and self-contained instead of dragging the whole overlay. */}
        <div className="overflow-y-auto overscroll-contain flex-1 rounded-none sm:rounded-2xl">
        <div className="p-6 sm:p-8 pt-12 sm:pt-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`${badge.bg} px-2.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.15em] text-white rounded`}>
              {story.category}
            </span>
            {fmt && fmt.label !== 'News' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] uppercase tracking-[0.12em] border ${fmt.bg} ${fmt.text} ${fmt.border}`}>
                {fmt.symbol && <span>{fmt.symbol}</span>}
                {fmt.label}
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white mb-4">
            {story.headline}
          </h1>

          {/* Article image — sits right under the headline so the lead photo
              anchors the piece without ever being cropped by a fixed-aspect frame. */}
          {(detail?.articleImage || story.articleImage || story.coverImage) && (
            <figure className="mb-5 -mx-6 sm:mx-0 sm:rounded-xl overflow-hidden bg-navy-100/40 border-y sm:border border-white/[0.06]">
              <img
                src={detail?.articleImage || story.articleImage || story.coverImage}
                alt={story.headline}
                className="block w-full h-auto max-h-[60vh] object-contain bg-navy"
                loading="lazy"
              />
            </figure>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-gray-500 font-body mb-5">
            {story.author && <span>By <strong className="text-gray-300">{story.author}</strong></span>}
            <span className="flex items-center gap-1"><Clock size={12} /> {story.timestamp}</span>
            <span>·</span>
            <span>{story.readTime}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><MessageSquare size={12} /> {story.commentCount || comments.length}</span>
            <button
              type="button"
              onClick={toggleBookmark}
              disabled={saving}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-display uppercase tracking-wider transition-all ${
                bookmarked
                  ? 'border-gold/40 text-gold bg-gold/10'
                  : 'border-white/10 text-gray-400 hover:text-gold hover:border-gold/30'
              }`}
            >
              <BookmarkIcon size={12} fill={bookmarked ? '#FFD700' : 'none'} />
              {bookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          {story.summary && (
            <p className="text-base text-gray-300 font-body leading-relaxed mb-5 border-l-2 border-gold/40 pl-4 italic">
              {story.summary}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <a key={t.slug || t.name}
                  href={`#/tag/${encodeURIComponent((t.slug || t.name).toString().toLowerCase())}`}
                  onClick={() => onClose?.()}
                  className="text-[11px] font-body text-gold/90 bg-gold/[0.08] border border-gold/20 hover:border-gold/50 hover:text-gold rounded-full px-2.5 py-0.5 transition-colors">
                  #{t.name}
                </a>
              ))}
            </div>
          )}

          {!user && gate.remaining < Infinity && (
            <div className="mb-6 flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-gold/20 bg-gold/[0.05]">
              <Lock size={14} className="text-gold shrink-0" />
              <div className="flex-1 min-w-0 text-[12px] font-body text-gray-300">
                {gate.remaining > 0 ? (
                  <>You have <span className="text-gold font-semibold">{gate.remaining} of {FREE_LIMIT}</span> free reads left. Sign up for unlimited access.</>
                ) : (
                  <>You've used your free reads. <button type="button" className="text-gold underline underline-offset-2" onClick={() => openAuth('signup')}>Sign up</button> to keep reading.</>
                )}
              </div>
              <button
                type="button"
                onClick={() => openAuth('signup')}
                className="shrink-0 px-3 py-1 rounded-full bg-gold/15 text-gold text-[11px] font-display uppercase tracking-wider border border-gold/30 hover:bg-gold/25"
              >
                Sign up free
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-gold/60" /></div>
          ) : (
            <div className="story-body font-body text-gray-300 leading-relaxed">
              {bodyHTML
                ? <div dangerouslySetInnerHTML={{ __html: bodyHTML }} />
                : <p className="text-gray-500 italic">The full piece is being edited — check back soon.</p>}
            </div>
          )}

          {/* Comments */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gold mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Comments ({comments.length})
            </h3>

            <form onSubmit={submitComment} className="flex gap-2 mb-6">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
                disabled={!user}
                onFocus={() => { if (!user) openAuth('login'); }}
                className="flex-1 px-3.5 py-2.5 rounded-lg text-sm font-body text-white placeholder-gray-500 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!user || !draft.trim()}
                className="px-4 py-2.5 rounded-lg font-display text-[12px] uppercase tracking-wider bg-gradient-to-r from-gold to-yellow-500 text-navy disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={13} /> Post
              </button>
            </form>

            <div className="space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-white/[0.06] bg-navy-100/40 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-display text-[12px] font-semibold text-white">
                      {c.user.display_name}
                    </span>
                    <span className="text-[11px] text-gray-600">· {c.timestamp}</span>
                  </div>
                  <p className="text-[14px] text-gray-300 font-body leading-relaxed">{c.body}</p>
                  <button
                    type="button"
                    onClick={() => likeComment(c)}
                    className={`mt-2 inline-flex items-center gap-1 text-[11px] font-display uppercase tracking-wider transition-colors ${
                      c.liked_by_me ? 'text-gold' : 'text-gray-500 hover:text-gold'
                    }`}
                  >
                    <ThumbsUp size={11} fill={c.liked_by_me ? '#FFD700' : 'none'} />
                    {c.like_count}
                  </button>
                </div>
              ))}
              {!comments.length && (
                <p className="text-gray-500 text-[13px] font-body italic">Be the first to comment.</p>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
