// EASD Admin — Videos manager.

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Video as VideoIcon, Eye, Upload, X as XIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal, Select,
  Spinner, TagInput, TextArea, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const GRADIENT_PRESETS = [
  'from-blue-900 via-indigo-900 to-navy',
  'from-emerald-900 via-teal-900 to-navy',
  'from-red-900 via-rose-900 to-navy',
  'from-purple-900 via-fuchsia-900 to-navy',
  'from-amber-900 via-orange-900 to-navy',
  'from-gray-900 via-neutral-900 to-navy',
];
const CATEGORY_OPTIONS = ['Highlights', 'Feature', 'Documentary', 'Analysis', 'Interview', 'Opinion'];

const blank = {
  title: '',
  description: '',
  duration: '',
  video_url: '',
  category: 'Highlights',
  sport_category: '',
  gradient: GRADIENT_PRESETS[0],
  is_featured: false,
  view_count: 0,
  tag_names: [],
};

function VideoForm({ editing, onSaved, onCancel, showToast }) {
  const { categories } = useAppData();
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [clearThumb, setClearThumb] = useState(false);
  const fileRef = useRef(null);
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      title: editing.title || '',
      description: editing.description || '',
      duration: editing.duration || '',
      video_url: editing.video_url || '',
      category: editing.category || 'Highlights',
      sport_category: editing.sport_category || '',
      gradient: editing.gradient || GRADIENT_PRESETS[0],
      is_featured: Boolean(editing.is_featured),
      view_count: editing.view_count ?? 0,
      tag_names: Array.isArray(editing.tags) ? editing.tags.map((t) => t.name || t) : [],
    } : blank);
    setThumbFile(null);
    setThumbPreview(editing?.thumbnail || '');
    setClearThumb(false);
  }, [editing]);

  const pickThumb = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Thumbnail must be an image.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Thumbnail must be under 4 MB.'); return; }
    setError('');
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
    setClearThumb(false);
  };

  const clearThumbNow = () => {
    setThumbFile(null);
    setThumbPreview('');
    setClearThumb(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const base = {
      title: form.title,
      description: form.description,
      duration: form.duration,
      video_url: form.video_url,
      category: form.category,
      sport_category: form.sport_category ? Number(form.sport_category) : null,
      gradient: form.gradient,
      is_featured: form.is_featured,
      view_count: Number(form.view_count) || 0,
      tag_names: Array.isArray(form.tag_names) ? form.tag_names : [],
    };
    let payload;
    if (thumbFile || clearThumb) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (k === 'tag_names') {
          (v || []).forEach((t) => fd.append('tag_names', t));
        } else if (typeof v === 'boolean') {
          fd.append(k, v ? 'true' : 'false');
        } else if (v == null) {
          fd.append(k, '');
        } else {
          fd.append(k, String(v));
        }
      });
      if (thumbFile) fd.append('thumbnail', thumbFile);
      else if (clearThumb) fd.append('thumbnail', '');
      payload = fd;
    } else {
      payload = base;
    }
    try {
      if (isEdit) {
        await api.admin.videos.update(editing.slug, payload);
        showToast.showSuccess('Video updated');
      } else {
        await api.admin.videos.create(payload);
        showToast.showSuccess('Video created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title" required>
        <TextInput value={form.title} onChange={(v) => setField('title', v)} required />
      </Field>
      <Field label="Description">
        <TextArea rows={2} value={form.description} onChange={(v) => setField('description', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration" hint="e.g. 3:42 or 22:15">
          <TextInput value={form.duration} onChange={(v) => setField('duration', v)} placeholder="3:42" />
        </Field>
        <Field label="Video URL" hint="YouTube, Vimeo, or direct mp4">
          <TextInput value={form.video_url} onChange={(v) => setField('video_url', v)} placeholder="https://…" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Video category">
          <Select value={form.category} onChange={(v) => setField('category', v)}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Sport">
          <Select value={form.sport_category} onChange={(v) => setField('sport_category', v)}
            options={[{ value: '', label: '— None —' },
              ...categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]} />
        </Field>
      </div>

      <Field label="Thumbnail" hint="Optional cover image — 16:9 jpg/png. Falls back to the gradient when blank.">
        <div className="flex items-center gap-3">
          <div className="w-32 h-20 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center">
            {thumbPreview ? (
              <img src={thumbPreview} alt="thumbnail" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-600 text-[11px] font-body">No thumbnail</span>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickThumb(e.target.files?.[0])}
            />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> {thumbPreview ? 'Replace' : 'Upload'}
            </Button>
            {thumbPreview && (
              <Button type="button" variant="ghost" onClick={clearThumbNow}>
                <XIcon size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
      </Field>

      <Field label="Gradient">
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button key={g} type="button" onClick={() => setField('gradient', g)}
              className={`h-10 rounded-lg bg-gradient-to-br ${g} border ${
                form.gradient === g ? 'border-gold ring-2 ring-gold/30' : 'border-white/10 hover:border-white/30'
              }`} />
          ))}
        </div>
        <TextInput value={form.gradient} onChange={(v) => setField('gradient', v)} />
      </Field>

      <Field label="Tags" hint="Freeform — shared with stories. Type and press enter.">
        <TagInput value={form.tag_names} onChange={(v) => setField('tag_names', v)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="View count">
          <TextInput type="number" value={form.view_count} onChange={(v) => setField('view_count', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_featured} onChange={(v) => setField('is_featured', v)} label="Featured" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create video'}</Button>
      </div>
    </form>
  );
}

export default function VideosManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await api.admin.videos.list()); }
    catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load videos')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const list = Array.isArray(rows) ? rows : rows?.results || [];
  const bulk = useBulkSelect(list);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.videos.remove(toDelete.slug);
      showToast.showSuccess('Video deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.videos.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} video${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">{list.length} videos</div>
          {list.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all videos"
              />
              Select all
            </label>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New video
        </Button>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="videos" />

      {loading ? <Spinner /> : !list.length ? (
        <EmptyState icon={<VideoIcon size={28} />} title="No videos yet" hint="Add highlight reels, features, or documentaries." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((v) => (
            <div key={v.id} className={`relative rounded-xl overflow-hidden border bg-navy-100/40 transition-colors ${
              bulk.isSelected(v.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
            }`}>
              <div className="absolute top-2 left-2 z-10 p-1 rounded bg-black/40 backdrop-blur-sm">
                <BulkCheckbox
                  checked={bulk.isSelected(v.id)}
                  onChange={() => bulk.toggle(v.id)}
                  ariaLabel={`Select ${v.title}`}
                />
              </div>
              <div className={`h-28 bg-gradient-to-br ${v.gradient || 'from-navy-200 via-navy-100 to-charcoal'} relative overflow-hidden`}>
                {v.thumbnail && (
                  <img src={v.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {v.is_featured && <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded bg-gold/20 text-gold font-display text-[10px] uppercase tracking-wider">Featured</span>}
                <span className="absolute bottom-2 left-2 text-white font-mono text-[11px] bg-black/60 px-1.5 py-0.5 rounded">{v.duration || '—'}</span>
                <span className="absolute bottom-2 right-2 text-gray-300 font-body text-[11px] flex items-center gap-1"><Eye size={11} />{v.views || v.view_count}</span>
              </div>
              <div className="p-3">
                <div className="font-display text-[10px] uppercase tracking-wider text-gold/70 mb-1">{v.category}</div>
                <div className="text-sm text-white font-semibold line-clamp-2 mb-2">{v.title}</div>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => { setEditing(v); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={13} /></button>
                  <button type="button" onClick={() => setToDelete(v)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? 'Edit video' : 'New video'}>
        <VideoForm editing={editing} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete video?"
        message={`This will permanently remove "${toDelete?.title}".`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} video${bulk.count === 1 ? '' : 's'}?`}
        message="This will permanently remove the selected videos."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
