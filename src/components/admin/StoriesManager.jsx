// EASD Admin — Stories manager. Full CRUD backed by the DRF API.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, FileText, Eye, Star, Flame, Upload, X as XIcon, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal, Select,
  Spinner, TagInput, TextArea, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';
import MarkdownEditor from './MarkdownEditor';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];
const PLACEMENT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'hero', label: 'Hero' },
  { value: 'featured', label: 'Featured grid' },
  { value: 'top', label: 'Top stories sidebar' },
  { value: 'editors_pick', label: "Editor's pick" },
];
const EP_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'longform', label: 'Longform' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'opinion', label: 'Opinion' },
];
const FORMAT_OPTIONS = [
  { value: 'news',          label: '📰 News' },
  { value: 'analysis',      label: '🧠 Analysis' },
  { value: 'opinion',       label: '💬 Opinion' },
  { value: 'interview',     label: '🎙 Interview' },
  { value: 'feature',       label: '✨ Feature' },
  { value: 'match_preview', label: '🔍 Match Preview' },
  { value: 'match_report',  label: '📝 Match Report' },
  { value: 'live_blog',     label: '🔴 Live Blog' },
  { value: 'quick_hit',     label: '⚡ Quick Hit' },
  { value: 'gossip',        label: '🗣 Gossip' },
];
const GRADIENT_PRESETS = [
  'from-emerald-900/80 via-teal-900/60 to-navy',
  'from-amber-900/80 via-orange-900/60 to-navy',
  'from-rose-900/80 via-red-900/60 to-navy',
  'from-blue-900/80 via-indigo-900/60 to-navy',
  'from-purple-900/80 via-fuchsia-900/60 to-navy',
  'from-yellow-900/80 via-amber-800/60 to-navy',
];

const blank = {
  headline: '',
  summary: '',
  body: '',
  category: '',
  status: 'published',
  placement: 'none',
  placement_rank: 0,
  editors_pick_type: '',
  story_format: 'news',
  tag_names: [],
  is_live: false,
  is_breaking: false,
  read_minutes: 3,
  gradient: GRADIENT_PRESETS[0],
};

function StoryForm({ editing, onSaved, onCancel, showToast }) {
  const { categories } = useAppData();
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [clearCover, setClearCover] = useState(false);
  const [articleFile, setArticleFile] = useState(null);
  const [articlePreview, setArticlePreview] = useState('');
  const [clearArticle, setClearArticle] = useState(false);
  const fileRef = useRef(null);
  const articleFileRef = useRef(null);
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    if (!editing) {
      setForm(blank);
      setCoverFile(null); setCoverPreview(''); setClearCover(false);
      setArticleFile(null); setArticlePreview(''); setClearArticle(false);
      return;
    }
    const loadDetail = async () => {
      try {
        const d = await api.admin.stories.detail(editing.slug);
        setForm({
          headline: d.headline || '',
          summary: d.summary || '',
          body: d.body || '',
          category: d.category_id ?? (typeof d.category === 'number' ? d.category : '') ?? '',
          status: d.status || 'published',
          placement: d.placement || 'none',
          placement_rank: d.placement_rank ?? 0,
          editors_pick_type: d.editors_pick_type || d.type || '',
          story_format: d.format || d.story_format || 'news',
          tag_names: Array.isArray(d.tags) ? d.tags.map((t) => t.name || t) : [],
          is_live: Boolean(d.isLive ?? d.is_live),
          is_breaking: Boolean(d.isBreaking ?? d.is_breaking),
          read_minutes: parseInt((d.readTime || '3').match(/\d+/)?.[0] || 3, 10),
          gradient: d.gradient || GRADIENT_PRESETS[0],
        });
        setCoverFile(null);
        setCoverPreview(d.coverImage || '');
        setClearCover(false);
        setArticleFile(null);
        // Server may have filled articleImage with the cover URL as a fallback; only
        // show a preview if the story actually has its own article image. Best-effort:
        // if the article image differs from cover, show it; otherwise treat as unset.
        setArticlePreview(
          d.articleImage && d.articleImage !== d.coverImage ? d.articleImage : ''
        );
        setClearArticle(false);
      } catch (e) { setError(apiErrorMessage(e, 'Could not load story')); }
    };
    loadDetail();
  }, [editing?.slug]);

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Image must be under 4 MB.'); return; }
    setError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setClearCover(false);
  };

  const clearCoverNow = () => {
    setCoverFile(null);
    setCoverPreview('');
    setClearCover(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const pickArticleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Image must be under 4 MB.'); return; }
    setError('');
    setArticleFile(file);
    setArticlePreview(URL.createObjectURL(file));
    setClearArticle(false);
  };

  const clearArticleNow = () => {
    setArticleFile(null);
    setArticlePreview('');
    setClearArticle(true);
    if (articleFileRef.current) articleFileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const base = {
      headline: form.headline,
      summary: form.summary,
      body: form.body,
      category: form.category ? Number(form.category) : null,
      status: form.status,
      placement: form.placement,
      placement_rank: Number(form.placement_rank) || 0,
      editors_pick_type: form.editors_pick_type || '',
      story_format: form.story_format || 'news',
      is_live: Boolean(form.is_live),
      is_breaking: Boolean(form.is_breaking),
      read_minutes: Number(form.read_minutes) || 3,
      gradient: form.gradient || '',
    };
    const tagNames = Array.isArray(form.tag_names) ? form.tag_names : [];
    const needsMultipart = coverFile || clearCover || articleFile || clearArticle;
    let payload;
    if (needsMultipart) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (v === null || v === undefined) { fd.append(k, ''); return; }
        fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
      });
      tagNames.forEach((t) => fd.append('tag_names', t));
      if (coverFile) fd.append('cover_image', coverFile);
      else if (clearCover) fd.append('cover_image', '');
      if (articleFile) fd.append('article_image', articleFile);
      else if (clearArticle) fd.append('article_image', '');
      payload = fd;
    } else {
      payload = { ...base, tag_names: tagNames };
    }
    try {
      if (isEdit) {
        await api.admin.stories.update(editing.slug, payload);
        showToast.showSuccess('Story updated');
      } else {
        await api.admin.stories.create(payload);
        showToast.showSuccess('Story created');
      }
      onSaved();
    } catch (e2) {
      setError(apiErrorMessage(e2, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Headline" required>
        <TextInput value={form.headline} onChange={(v) => setField('headline', v)} required />
      </Field>

      <Field label="Summary" hint="Short blurb shown under the headline on cards and story pages.">
        <TextArea rows={2} value={form.summary} onChange={(v) => setField('summary', v)} />
      </Field>

      <Field label="Body" hint="Markdown supported — **bold**, *italic*, ## heading, > quote, lists, [links](https://…). Separate paragraphs with a blank line.">
        <MarkdownEditor rows={10} value={form.body} onChange={(v) => setField('body', v)} />
      </Field>

      <Field label="Cover image" hint="Optional — up to 4 MB. Falls back to the gradient below when empty.">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center">
            {coverPreview ? (
              <img src={coverPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-gray-600 font-display uppercase tracking-wider">No cover</span>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => pickFile(e.target.files?.[0])}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={12} /> {coverPreview ? 'Replace' : 'Upload'}
              </Button>
              {coverPreview && (
                <Button variant="ghost" size="sm" onClick={clearCoverNow}>
                  <XIcon size={12} /> Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-gray-600 font-body">
              JPG / PNG / WebP. Renders full-bleed on story cards and the hero.
            </p>
          </div>
        </div>
      </Field>

      <Field label="Article image" hint="Optional — shown inside the article, right after the headline. Falls back to the cover image when empty.">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-white/10 bg-white/[0.03] flex items-center justify-center">
            {articlePreview ? (
              <img src={articlePreview} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[10px] text-gray-600 font-display uppercase tracking-wider">Uses cover</span>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              ref={articleFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => pickArticleFile(e.target.files?.[0])}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => articleFileRef.current?.click()}>
                <Upload size={12} /> {articlePreview ? 'Replace' : 'Upload'}
              </Button>
              {articlePreview && (
                <Button variant="ghost" size="sm" onClick={clearArticleNow}>
                  <XIcon size={12} /> Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-gray-600 font-body">
              Up to 4 MB. Rendered uncropped inside the reader, so portraits and panoramas both look right.
            </p>
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" required>
          <Select
            value={form.category}
            onChange={(v) => setField('category', v)}
            options={[{ value: '', label: '— Select —' },
              ...categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(v) => setField('status', v)} options={STATUS_OPTIONS} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Format" hint="Drives the badge style on cards. Pick the editorial genre.">
          <Select value={form.story_format} onChange={(v) => setField('story_format', v)} options={FORMAT_OPTIONS} />
        </Field>
        <Field label="Tags" hint="Freeform — type and press enter. Existing tags are reused.">
          <TagInput value={form.tag_names} onChange={(v) => setField('tag_names', v)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Placement" hint="Where this story appears on the landing page.">
          <Select value={form.placement} onChange={(v) => setField('placement', v)} options={PLACEMENT_OPTIONS} />
        </Field>
        <Field label="Placement rank" hint="Lower numbers appear first.">
          <TextInput type="number" value={form.placement_rank} onChange={(v) => setField('placement_rank', v)} />
        </Field>
      </div>

      {form.placement === 'editors_pick' && (
        <Field label="Editor's pick type">
          <Select value={form.editors_pick_type} onChange={(v) => setField('editors_pick_type', v)} options={EP_TYPE_OPTIONS} />
        </Field>
      )}

      <Field label="Read minutes">
        <TextInput type="number" value={form.read_minutes} onChange={(v) => setField('read_minutes', v)} />
      </Field>

      <Field label="Gradient" hint="Tailwind gradient classes used for the story cover background.">
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setField('gradient', g)}
              className={`relative h-10 rounded-lg bg-gradient-to-br ${g} border ${
                form.gradient === g ? 'border-gold ring-2 ring-gold/30' : 'border-white/10 hover:border-white/30'
              }`}
            />
          ))}
        </div>
        <TextInput value={form.gradient} onChange={(v) => setField('gradient', v)} placeholder="from-… via-… to-…" />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Toggle value={form.is_live} onChange={(v) => setField('is_live', v)} label="Live updates" />
        <Toggle value={form.is_breaking} onChange={(v) => setField('is_breaking', v)} label="Breaking" />
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create story'}</Button>
      </div>
    </form>
  );
}

export default function StoriesManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.admin.stories.list();
      setRows(data || []);
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load stories')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Live counts power the filter chip badges so editors see what's in each
  // bucket without clicking through.
  const counts = useMemo(() => {
    const c = { all: rows.length, drafts: 0, breaking: 0 };
    for (const r of rows) {
      if (r.status === 'draft') c.drafts += 1;
      if (r.isBreaking) c.breaking += 1;
      const p = r.placement || 'none';
      c[p] = (c[p] || 0) + 1;
      const f = r.format || 'news';
      c[`fmt:${f}`] = (c[`fmt:${f}`] || 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== 'all') {
      out = out.filter((r) => (r.placement || 'none') === filter
        || (filter === 'drafts' && r.status === 'draft')
        || (filter === 'breaking' && r.isBreaking));
    }
    if (formatFilter !== 'all') {
      out = out.filter((r) => (r.format || 'news') === formatFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        (r.headline || '').toLowerCase().includes(q)
        || (r.category || '').toLowerCase().includes(q)
        || (r.author || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [rows, filter, formatFilter, search]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.stories.remove(toDelete.slug);
      showToast.showSuccess('Story deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.stories.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} stor${ok === 1 ? 'y' : 'ies'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {[
              ['all', 'All'],
              ['drafts', 'Drafts'],
              ['breaking', 'Breaking'],
              ['hero', 'Hero'],
              ['featured', 'Featured'],
              ['top', 'Top'],
              ['editors_pick', "Editor's"],
            ].map(([f, label]) => {
              const count = counts[f] ?? counts[f === 'editors_pick' ? 'editors_pick' : f];
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full font-display text-[11px] uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 ${
                    filter === f ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                  {count != null && (
                    <span className={`text-[10px] tabular-nums ${filter === f ? 'text-gold/70' : 'text-gray-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 w-56">
              <Search size={12} className="text-gray-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search headlines, authors…"
                className="flex-1 bg-transparent outline-none text-[12px] font-body text-white placeholder-gray-500"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="text-gray-500 hover:text-white" aria-label="Clear search">
                  <XIcon size={11} />
                </button>
              )}
            </div>
            <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
              <Plus size={14} /> New story
            </Button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] uppercase tracking-wider font-display text-gray-500 mr-1">Format</span>
          {[
            ['all', 'All formats'],
            ['gossip', '🗣 Gossip'],
            ['opinion', '💬 Opinion'],
            ['analysis', '🧠 Analysis'],
            ['match_report', '📝 Match Report'],
            ['feature', '✨ Feature'],
            ['news', '📰 News'],
          ].map(([f, label]) => {
            const count = f === 'all' ? rows.length : counts[`fmt:${f}`];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFormatFilter(f)}
                className={`px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 ${
                  formatFilter === f ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/[0.02] border border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {label}
                {count != null && count > 0 && (
                  <span className="text-[10px] tabular-nums opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="stories" />

      {loading ? <Spinner /> : !filtered.length ? (
        <EmptyState icon={<FileText size={28} />} title="No stories in this filter" hint="Create one to get started." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="min-w-full text-[13px] font-body">
            <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
              <tr>
                <th className="px-3 py-2 w-8">
                  <BulkCheckbox
                    checked={bulk.allSelected}
                    indeterminate={bulk.someSelected}
                    onChange={bulk.toggleAll}
                    ariaLabel="Select all stories"
                  />
                </th>
                <th className="px-3 py-2">Headline</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Placement</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Views</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2">
                    <BulkCheckbox
                      checked={bulk.isSelected(r.id)}
                      onChange={() => bulk.toggle(r.id)}
                      ariaLabel={`Select ${r.headline}`}
                    />
                  </td>
                  <td className="px-3 py-2 max-w-md">
                    <div className="text-white font-medium line-clamp-1 flex items-center gap-2">
                      {r.isBreaking && <Flame size={12} className="text-red-400" />}
                      {r.isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />}
                      {r.headline}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>by {r.author || '—'} · {r.timestamp}</span>
                      {r.format && r.format !== 'news' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {r.formatLabel || r.format}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{r.category || '—'}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {r.placement !== 'none' && <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-display">
                      {r.placement === 'hero' && <Star size={10} className="text-gold" />}
                      {r.placement}
                    </span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-display text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      r.placement && r.placement !== 'none' ? '' : ''
                    } ${
                      r.isLive ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5 text-gray-400'
                    }`}>
                      {/* StoryListSerializer doesn't include status for non-manage endpoints but manage does. */}
                      {r.status || 'published'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 tabular-nums">
                    <span className="inline-flex items-center gap-1"><Eye size={11} />{r.view_count ?? 0}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button" title="Edit"
                        onClick={() => { setEditing(r); setOpenForm(true); }}
                        className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10">
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button" title="Delete"
                        onClick={() => setToDelete(r)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="lg"
        title={editing ? 'Edit story' : 'New story'}>
        <StoryForm
          editing={editing}
          showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete story?"
        message={`This will permanently remove "${toDelete?.headline}".`}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} stor${bulk.count === 1 ? 'y' : 'ies'}?`}
        message="This will permanently remove the selected stories."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
