// EASD Component — TrendingInteractions
// Twitter-lite engagement block for a trending hashtag's dedicated mini-page.
// Renders the hashtag's like button (with optimistic toggling), a flat thread
// of comments, an inline compose box, and per-comment likes. Mirrors the
// patterns used by StoryReader so the auth-gated experience stays consistent.

import { useEffect, useState } from 'react';
import { Heart, MessageSquare, Send, Loader2, Trash2, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

function formatCount(n) {
  if (n == null) return 0;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function TrendingInteractions({ topic }) {
  const { user, openAuth } = useAuth();
  const [liked, setLiked] = useState(Boolean(topic?.liked_by_me));
  const [likeCount, setLikeCount] = useState(topic?.like_count || 0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  // Re-sync the headline state when the parent passes in a different topic
  // (e.g. user navigates between tag pages without unmounting).
  useEffect(() => {
    setLiked(Boolean(topic?.liked_by_me));
    setLikeCount(topic?.like_count || 0);
  }, [topic?.id, topic?.liked_by_me, topic?.like_count]);

  useEffect(() => {
    if (!topic?.id) return;
    let alive = true;
    setLoadingComments(true);
    api.trending.comments(topic.id)
      .then((rows) => {
        if (!alive) return;
        setComments(Array.isArray(rows) ? rows : (rows?.results || []));
      })
      .catch(() => { if (alive) setComments([]); })
      .finally(() => { if (alive) setLoadingComments(false); });
    return () => { alive = false; };
  }, [topic?.id]);

  const toggleLike = async () => {
    if (!user) { openAuth('login'); return; }
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic update — roll back on failure.
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount(prevCount + (wasLiked ? -1 : 1));
    try {
      const res = await api.trending.likeToggle(topic.id);
      setLiked(Boolean(res?.liked));
      if (typeof res?.like_count === 'number') setLikeCount(res.like_count);
    } catch {
      setLiked(wasLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) { openAuth('login'); return; }
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      const c = await api.trending.addComment(topic.id, body);
      setComments((rows) => [c, ...rows]);
      setDraft('');
    } catch (err) {
      alert(err.message || 'Could not post comment');
    } finally {
      setPosting(false);
    }
  };

  const likeComment = async (comment) => {
    if (!user) { openAuth('login'); return; }
    const wasLiked = comment.liked_by_me;
    setComments((rows) => rows.map((c) => c.id === comment.id
      ? { ...c, liked_by_me: !wasLiked, like_count: (c.like_count || 0) + (wasLiked ? -1 : 1) }
      : c));
    try {
      const res = await api.trending.likeComment(comment.id);
      setComments((rows) => rows.map((c) => c.id === comment.id
        ? { ...c, liked_by_me: Boolean(res?.liked), like_count: res?.like_count ?? c.like_count }
        : c));
    } catch {
      setComments((rows) => rows.map((c) => c.id === comment.id
        ? { ...c, liked_by_me: wasLiked, like_count: (c.like_count || 0) + (wasLiked ? 1 : -1) }
        : c));
    }
  };

  const deleteComment = async (comment) => {
    if (!user) return;
    if (comment.user.id !== user.id && user.role !== 'admin') return;
    if (!window.confirm('Delete this comment?')) return;
    const snapshot = comments;
    setComments((rows) => rows.filter((c) => c.id !== comment.id));
    try {
      await api.trending.deleteComment(comment.id);
    } catch {
      setComments(snapshot);
    }
  };

  if (!topic) return null;

  return (
    <div className="mt-3 mb-7 max-w-3xl">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-display uppercase tracking-wider transition-all ${
            liked
              ? 'border-rose-400/50 bg-rose-500/10 text-rose-300'
              : 'border-white/10 text-gray-400 hover:border-rose-400/40 hover:text-rose-300'
          }`}
          aria-pressed={liked}
        >
          <Heart size={13} fill={liked ? 'currentColor' : 'none'}
            className={liked ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
          {formatCount(likeCount)}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 text-[12px] font-display uppercase tracking-wider transition-all"
        >
          <MessageSquare size={13} />
          {formatCount(topic.comment_count || comments.length)}
          <span className="hidden sm:inline">· {showComments ? 'hide' : 'show'}</span>
        </button>
        <span className="text-[11px] text-gray-500 font-body ml-auto">
          {user ? 'Be part of the conversation.' : (
            <>
              <button type="button" onClick={() => openAuth('login')}
                className="text-gold underline underline-offset-2 hover:text-yellow-300">Sign in</button>
              {' to like or comment.'}
            </>
          )}
        </span>
      </div>

      {showComments && (
        <div className="mt-5 rounded-2xl border border-white/[0.05] bg-navy-100/40 p-4 sm:p-5">
          <form onSubmit={submit} className="flex gap-2 mb-5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={user ? `Reply to #${topic.tag}…` : 'Sign in to add your take'}
              disabled={!user || posting}
              onFocus={() => { if (!user) openAuth('login'); }}
              maxLength={500}
              className="flex-1 px-3.5 py-2.5 rounded-lg text-sm font-body text-white placeholder-gray-500 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!user || !draft.trim() || posting}
              className="px-4 py-2.5 rounded-lg font-display text-[12px] uppercase tracking-wider bg-gradient-to-r from-gold to-yellow-500 text-navy disabled:opacity-50 flex items-center gap-1.5"
            >
              {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Post
            </button>
          </form>

          {loadingComments ? (
            <div className="py-6 flex justify-center"><Loader2 size={18} className="text-gold/60 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <p className="py-6 text-center text-gray-500 text-[13px] font-body italic">
              No replies yet — start the conversation.
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const mine = user && c.user.id === user.id;
                return (
                  <article key={c.id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-display text-[12px] font-semibold text-white">
                        {c.user.display_name}
                      </span>
                      <span className="text-[11px] text-gray-600">· {c.timestamp}</span>
                      {mine && (
                        <button type="button"
                          onClick={() => deleteComment(c)}
                          className="ml-auto p-1 text-gray-500 hover:text-red-400 transition-colors"
                          aria-label="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-[14px] text-gray-200 font-body leading-relaxed whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => likeComment(c)}
                        className={`inline-flex items-center gap-1 text-[11px] font-display uppercase tracking-wider transition-colors ${
                          c.liked_by_me ? 'text-gold' : 'text-gray-500 hover:text-gold'
                        }`}
                      >
                        <ThumbsUp size={11} fill={c.liked_by_me ? '#FFD700' : 'none'} />
                        {c.like_count || 0}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
