// EASD Admin — Sport categories.

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Layers, Upload, X as XIcon } from 'lucide-react';
import { api } from '../../lib/api';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Spinner, TextArea, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const blank = {
  name: '', icon: '⚽', color: '#00A86B', description: '',
  subtitle: '', is_nav: false, order: 0,
};

const ICON_PRESETS = ['⚽', '🏀', '🏉', '🏐', '🏏', '🎾', '🏊', '🏃', '🥊', '🚴', '🏇', '🏁'];
const COLOR_PRESETS = ['#00A86B', '#DA291C', '#FFB81C', '#0072CE', '#7D2181', '#F28C28', '#1D4E89', '#D7263D'];

function CategoryForm({ editing, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [clearCover, setClearCover] = useState(false);
  const fileRef = useRef(null);
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      icon: editing.icon || '⚽',
      color: editing.color || '#00A86B',
      description: editing.description || '',
      subtitle: editing.subtitle || '',
      is_nav: Boolean(editing.is_nav),
      order: editing.order ?? 0,
    } : blank);
    setCoverFile(null);
    setCoverPreview(editing?.cover_url || '');
    setClearCover(false);
  }, [editing]);

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

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const basePayload = {
      name: form.name,
      icon: form.icon,
      color: form.color,
      description: form.description,
      subtitle: form.subtitle || '',
      is_nav: form.is_nav,
      order: Number(form.order) || 0,
    };
    const needsMultipart = coverFile || clearCover;
    let payload;
    if (needsMultipart) {
      const fd = new FormData();
      Object.entries(basePayload).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v ?? '')));
      if (coverFile) fd.append('cover_image', coverFile);
      else if (clearCover) fd.append('cover_image', '');
      payload = fd;
    } else {
      payload = basePayload;
    }
    try {
      if (isEdit) {
        await api.admin.categories.update(editing.slug, payload);
        showToast.showSuccess('Category updated');
      } else {
        await api.admin.categories.create(payload);
        showToast.showSuccess('Category created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" required>
        <TextInput value={form.name} onChange={(v) => setField('name', v)} required />
      </Field>
      <Field label="Subtitle" hint="Short tagline under the category title on landing pages.">
        <TextInput value={form.subtitle} onChange={(v) => setField('subtitle', v)} placeholder="Goals, drama, rivalries across East Africa" />
      </Field>
      <Field label="Description">
        <TextArea rows={2} value={form.description} onChange={(v) => setField('description', v)} />
      </Field>
      <Field label="Cover image" hint="Hero art for the category — 16:9 photo works best.">
        <div className="flex items-center gap-3">
          <div className="w-28 h-16 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center">
            {coverPreview ? (
              <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-600 text-[11px] font-body">No cover</span>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> {coverPreview ? 'Replace' : 'Upload'}
            </Button>
            {coverPreview && (
              <Button type="button" variant="ghost" onClick={clearCoverNow}>
                <XIcon size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
      </Field>
      <Field label="Icon">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ICON_PRESETS.map((ic) => (
            <button key={ic} type="button" onClick={() => setField('icon', ic)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                form.icon === ic ? 'bg-gold/10 border-gold text-gold' : 'bg-white/[0.03] border-white/10 hover:border-white/30'
              }`}>{ic}</button>
          ))}
        </div>
        <TextInput value={form.icon} onChange={(v) => setField('icon', v)} />
      </Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setField('color', c)}
              className={`w-9 h-9 rounded-lg border-2 ${form.color === c ? 'border-white' : 'border-white/20'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <TextInput value={form.color} onChange={(v) => setField('color', v)} placeholder="#00A86B" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Display order">
          <TextInput type="number" value={form.order} onChange={(v) => setField('order', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_nav} onChange={(v) => setField('is_nav', v)} label="Show in nav" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create category'}</Button>
      </div>
    </form>
  );
}

export default function CategoriesManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.categories.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load categories')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const bulk = useBulkSelect(rows);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.categories.remove(toDelete.slug);
      showToast.showSuccess('Category deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.categories.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} categor${ok === 1 ? 'y' : 'ies'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">{rows.length} categories · {rows.filter((r) => r.is_nav).length} in nav</div>
          {rows.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all categories"
              />
              Select all
            </label>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New category
        </Button>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="categories" />

      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<Layers size={28} />} title="No categories yet" hint="Create sports like Football, Basketball, Rugby…" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <div key={c.id} className={`rounded-xl border bg-navy-100/40 p-3 transition-colors ${
              bulk.isSelected(c.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BulkCheckbox
                    checked={bulk.isSelected(c.id)}
                    onChange={() => bulk.toggle(c.id)}
                    ariaLabel={`Select ${c.name}`}
                  />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-white/10" style={{ backgroundColor: `${c.color}20` }}>
                    {c.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-sm text-white uppercase tracking-wider truncate">{c.name}</div>
                    <div className="text-[11px] text-gray-500 font-body">{c.count ?? 0} articles{c.is_nav && ' · in nav'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => { setEditing(c); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                  <button type="button" onClick={() => setToDelete(c)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                </div>
              </div>
              {c.description && <div className="mt-2 text-[12px] text-gray-400 font-body line-clamp-2">{c.description}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm" title={editing ? 'Edit category' : 'New category'}>
        <CategoryForm editing={editing} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete category?"
        message={`This will remove "${toDelete?.name}". Articles will lose their category link.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} categor${bulk.count === 1 ? 'y' : 'ies'}?`}
        message="Articles in these categories will lose their category link."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
