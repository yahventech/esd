// EASD Admin — Trending hashtag/topic chips.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';
import MarkdownEditor from './MarkdownEditor';

const blank = { tag: '', body: '', post_count: 0, order: 0, is_active: true, category: '' };

function TrendingForm({ editing, categories, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.id);

  useEffect(() => {
    setForm(editing ? {
      tag: editing.tag || '',
      body: editing.body || '',
      post_count: editing.post_count ?? 0,
      order: editing.order ?? 0,
      is_active: editing.is_active !== false,
      category: editing.category ?? '',
    } : blank);
  }, [editing]);

  const categoryOptions = useMemo(() => [
    { value: '', label: '— Cross-sport (any trend) —' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ], [categories]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      tag: form.tag,
      body: form.body || '',
      is_active: form.is_active,
      post_count: Number(form.post_count) || 0,
      order: Number(form.order) || 0,
      category: form.category === '' ? null : Number(form.category),
    };
    try {
      if (isEdit) {
        await api.admin.trending.update(editing.id, payload);
        showToast.showSuccess('Topic updated');
      } else {
        await api.admin.trending.create(payload);
        showToast.showSuccess('Topic added');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tag" required hint="e.g. AFCON2025 or PremierLeague (no # needed)">
        <TextInput value={form.tag} onChange={(v) => setField('tag', v.replace(/^#/, ''))} required />
      </Field>
      <Field label="Sport" hint="Scope this trend to a sport, or leave blank for cross-sport.">
        <Select value={form.category} onChange={(v) => setField('category', v)} options={categoryOptions} />
      </Field>
      <Field label="Body" hint="Markdown intro shown above the story list on this hashtag's page. Optional.">
        <MarkdownEditor rows={6} value={form.body} onChange={(v) => setField('body', v)}
          placeholder="Set the scene for this hashtag — why it's trending, what to watch for, key context…" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Post count">
          <TextInput type="number" value={form.post_count} onChange={(v) => setField('post_count', v)} />
        </Field>
        <Field label="Display order">
          <TextInput type="number" value={form.order} onChange={(v) => setField('order', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_active} onChange={(v) => setField('is_active', v)} label="Active" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Add topic'}</Button>
      </div>
    </form>
  );
}

export default function TrendingManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.trending.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load topics')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const bulk = useBulkSelect(rows);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.trending.remove(toDelete.id);
      showToast.showSuccess('Topic deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.trending.remove(r.id));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} topic${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">{rows.length} topics · {rows.filter((r) => r.is_active).length} active</div>
          {rows.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all topics"
              />
              Select all
            </label>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New topic
        </Button>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="topics" />

      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<TrendingUp size={28} />} title="No trending topics" hint="Add hashtags to populate the trending sidebar." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map((r) => (
            <div key={r.id} className={`rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
              bulk.isSelected(r.id)
                ? 'bg-navy-100/50 border-gold/50 ring-1 ring-gold/30'
                : r.is_active ? 'bg-navy-100/40 border-white/[0.06]' : 'bg-navy-100/20 border-white/[0.04] opacity-60'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <BulkCheckbox
                  checked={bulk.isSelected(r.id)}
                  onChange={() => bulk.toggle(r.id)}
                  ariaLabel={`Select ${r.tag}`}
                />
                <div className="min-w-0">
                  <div className="font-display text-sm text-gold truncate">#{r.tag}</div>
                  <div className="text-[11px] text-gray-500 font-body flex items-center gap-1.5">
                    <span>{r.count || r.post_count} posts · order {r.order}</span>
                    {r.category_name && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded font-display text-[9px] uppercase tracking-wider bg-gold/10 text-gold/80 border border-gold/20">
                        {r.category_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => { setEditing(r); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                <button type="button" onClick={() => setToDelete(r)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm" title={editing ? 'Edit topic' : 'New trending topic'}>
        <TrendingForm editing={editing} categories={categories} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete topic?"
        message={`This will remove #${toDelete?.tag}.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} topic${bulk.count === 1 ? '' : 's'}?`}
        message="This will permanently remove the selected trending topics."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
