// EASD Admin — Freeform tag catalog shared by stories and videos.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Tag as TagIcon, Search } from 'lucide-react';
import { api } from '../../lib/api';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Spinner, TextInput, apiErrorMessage, bulkRemove, useBulkSelect,
} from './shared';

function TagForm({ editing, onSaved, onCancel, showToast }) {
  const [name, setName] = useState(editing?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.slug);

  useEffect(() => { setName(editing?.name || ''); setError(''); }, [editing]);

  const submit = async (e) => {
    e.preventDefault();
    const clean = name.trim().replace(/^#/, '').trim();
    if (!clean) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await api.admin.tags.update(editing.slug, { name: clean });
        showToast.showSuccess('Tag renamed');
      } else {
        await api.admin.tags.create({ name: clean });
        showToast.showSuccess('Tag created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" required hint="Use short, lowercase phrases like 'harambee-stars' or 'transfers'.">
        <TextInput value={name} onChange={setName} required placeholder="transfers" />
      </Field>
      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create tag'}</Button>
      </div>
    </form>
  );
}

export default function TagsManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.tags.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load tags')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().replace(/^#/, '').toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => (t.name || '').toLowerCase().includes(q));
  }, [rows, query]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.tags.remove(toDelete.slug);
      showToast.showSuccess('Tag deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.tags.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} tag${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const totalUses = rows.reduce((acc, t) => acc + (t.usage_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">
            {rows.length} tag{rows.length === 1 ? '' : 's'} · {totalUses} usage{totalUses === 1 ? '' : 's'}
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all tags"
              />
              Select all
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tags…"
              className="pl-7 pr-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[12px] font-body text-white placeholder-gray-600 outline-none focus:border-gold/40 w-48"
            />
          </div>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus size={14} /> New tag
          </Button>
        </div>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="tags" />

      {loading ? <Spinner /> : !filtered.length ? (
        <EmptyState
          icon={<TagIcon size={28} />}
          title={query ? 'No tags match that query' : 'No tags yet'}
          hint="Create freeform tags like #transfers, #afcon2026, #harambee-stars to give stories and videos a flexible spine."
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {filtered.map((t) => (
            <div key={t.id} className={`group relative inline-flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-full border transition-colors ${
              bulk.isSelected(t.id) ? 'bg-gold/15 border-gold/60' : 'bg-gold/5 border-gold/20 hover:border-gold/50'
            }`}>
              <BulkCheckbox
                checked={bulk.isSelected(t.id)}
                onChange={() => bulk.toggle(t.id)}
                ariaLabel={`Select ${t.name}`}
              />
              <span className="font-display text-[12px] uppercase tracking-wider text-gold">#{t.name}</span>
              <span className="text-[10px] font-mono text-gray-500 px-1.5 py-0.5 rounded-full bg-white/5">
                {t.usage_count ?? 0}
              </span>
              <button type="button" title="Rename"
                onClick={() => { setEditing(t); setOpenForm(true); }}
                className="p-1 rounded-full text-gray-500 hover:text-gold hover:bg-gold/10">
                <Pencil size={11} />
              </button>
              <button type="button" title="Delete"
                onClick={() => setToDelete(t)}
                className="p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm"
        title={editing ? 'Rename tag' : 'New tag'}>
        <TagForm editing={editing} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete tag?"
        message={`This removes #${toDelete?.name}. Stories and videos keep their other tags but lose this one.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} tag${bulk.count === 1 ? '' : 's'}?`}
        message="This removes the selected tags. Stories and videos keep their other tags but lose these."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
