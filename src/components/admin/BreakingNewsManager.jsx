// EASD Admin — Breaking news ticker items.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Zap, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const DEFAULT_TTL_MINUTES = 60;

const blank = {
  text: '', link_url: '', order: 0, is_active: true,
  ttl_minutes: DEFAULT_TTL_MINUTES, never_expires: false,
  category: '',
};

// Format an ISO timestamp into a relative "expires in 23 min" / "expired 4 min ago" label.
function ttlLabel(expiresAt) {
  if (!expiresAt) return { text: 'No expiry', tone: 'neutral' };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: 'No expiry', tone: 'neutral' };
  const mins = Math.round(ms / 60000);
  if (mins > 0) {
    const txt = mins >= 60 ? `Expires in ${Math.round(mins / 60)}h` : `Expires in ${mins}m`;
    return { text: txt, tone: mins < 10 ? 'warn' : 'ok' };
  }
  return { text: `Expired ${Math.abs(mins)}m ago`, tone: 'dead' };
}

function BreakingForm({ editing, categories, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.id);

  useEffect(() => {
    if (!editing) { setForm(blank); return; }
    // Convert the existing expires_at into a minutes-from-now value so editors
    // think in "how long should this stick around" rather than wall-clock time.
    const minsFromNow = editing.expires_at
      ? Math.round((new Date(editing.expires_at).getTime() - Date.now()) / 60000)
      : null;
    setForm({
      text: editing.text || '',
      link_url: editing.link_url || '',
      order: editing.order ?? 0,
      is_active: editing.is_active !== false,
      ttl_minutes: minsFromNow != null && minsFromNow > 0 ? minsFromNow : DEFAULT_TTL_MINUTES,
      never_expires: editing.expires_at == null,
      category: editing.category ?? '',
    });
  }, [editing]);

  const categoryOptions = useMemo(() => [
    { value: '', label: '— Cross-sport (shows everywhere) —' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ], [categories]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      text: form.text,
      link_url: form.link_url,
      order: Number(form.order) || 0,
      is_active: form.is_active,
      category: form.category === '' ? null : Number(form.category),
    };
    if (form.never_expires) {
      payload.expires_at = null;
    } else {
      const mins = Math.max(1, Number(form.ttl_minutes) || DEFAULT_TTL_MINUTES);
      payload.expires_at = new Date(Date.now() + mins * 60_000).toISOString();
    }
    try {
      if (isEdit) {
        await api.admin.breaking.update(editing.id, payload);
        showToast.showSuccess('Breaking news updated');
      } else {
        await api.admin.breaking.create(payload);
        showToast.showSuccess('Breaking news added');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Text" required>
        <TextInput value={form.text} onChange={(v) => setField('text', v)} required
          placeholder="Harambee Stars qualify for AFCON quarterfinals" />
      </Field>
      <Field label="Link URL" hint="Optional — opens on click">
        <TextInput value={form.link_url} onChange={(v) => setField('link_url', v)} placeholder="https://…" />
      </Field>
      <Field label="Sport" hint="Pick a sport to scope this alert, or leave blank for cross-sport coverage.">
        <Select value={form.category} onChange={(v) => setField('category', v)} options={categoryOptions} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Display order">
          <TextInput type="number" value={form.order} onChange={(v) => setField('order', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_active} onChange={(v) => setField('is_active', v)} label="Active" />
        </div>
      </div>

      <Field label="Auto-expire after" hint="Alerts disappear from the ticker once this clock runs out. Default 60 min.">
        <div className="flex items-center gap-2">
          <TextInput
            type="number"
            value={form.ttl_minutes}
            onChange={(v) => setField('ttl_minutes', v)}
            disabled={form.never_expires}
            min={1}
            className="w-24"
          />
          <span className="text-[12px] text-gray-400 font-body">minutes</span>
          <div className="flex gap-1 ml-2">
            {[15, 30, 60, 180].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setField('ttl_minutes', m); setField('never_expires', false); }}
                className="px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30"
              >{m >= 60 ? `${m / 60}h` : `${m}m`}</button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-[11px] font-body text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={form.never_expires}
              onChange={(e) => setField('never_expires', e.target.checked)}
              className="accent-gold"
            />
            Never expire
          </label>
        </div>
      </Field>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Add item'}</Button>
      </div>
    </form>
  );
}

export default function BreakingNewsManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  // Tick the clock every 30s so the "expires in Xm" labels stay current
  // without requiring the editor to click anything.
  const [, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.breaking.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load items')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const liveCount = useMemo(() => rows.filter((r) => r.is_live).length, [rows]);

  const bulk = useBulkSelect(rows);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.breaking.remove(toDelete.id);
      showToast.showSuccess('Item deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.breaking.remove(r.id));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} item${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const toggleActive = async (row) => {
    try {
      await api.admin.breaking.update(row.id, { is_active: !row.is_active });
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">
            {rows.length} items · {rows.filter((r) => r.is_active).length} active ·{' '}
            <span className="text-emerald-400">{liveCount} on air</span>
          </div>
          {rows.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all breaking news"
              />
              Select all
            </label>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New item
        </Button>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="items" />

      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<Zap size={28} />} title="No breaking items" hint="Add short ticker-style headlines that scroll across the top of the site." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className={`flex items-center justify-between gap-3 rounded-lg border bg-navy-100/40 px-3 py-2.5 transition-colors ${
              bulk.isSelected(r.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <BulkCheckbox
                  checked={bulk.isSelected(r.id)}
                  onChange={() => bulk.toggle(r.id)}
                  ariaLabel={`Select ${r.text}`}
                />
                <span className="font-mono text-[10px] text-gray-500 w-6 text-right">#{r.order}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-body truncate ${r.is_active ? 'text-white' : 'text-gray-500 line-through'}`}>{r.text}</div>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    {r.category_name ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded font-display text-[9px] uppercase tracking-wider bg-gold/10 text-gold/80 border border-gold/20">
                        {r.category_name}
                      </span>
                    ) : (
                      <span className="text-[10px] font-body text-gray-600 italic">Cross-sport</span>
                    )}
                    {r.link_url && <span className="text-gold/60 truncate flex-1 min-w-0">{r.link_url}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(() => {
                  const ttl = ttlLabel(r.expires_at);
                  const tone = ttl.tone;
                  const cls = tone === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : tone === 'warn'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : tone === 'dead'
                        ? 'bg-gray-500/10 text-gray-500 border-gray-500/30 line-through'
                        : 'bg-white/[0.04] text-gray-400 border-white/10';
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border ${cls}`}>
                      <Clock size={10} /> {ttl.text}
                    </span>
                  );
                })()}
                <button type="button" onClick={() => toggleActive(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border ${
                    r.is_active
                      ? 'bg-emerald/10 text-emerald border-emerald/30'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  }`}>
                  {r.is_active ? 'Active' : 'Paused'}
                </button>
                <button type="button" onClick={() => { setEditing(r); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={13} /></button>
                <button type="button" onClick={() => setToDelete(r)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm" title={editing ? 'Edit breaking news' : 'New breaking news'}>
        <BreakingForm editing={editing} categories={categories} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete item?"
        message={`This will remove "${toDelete?.text}".`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} item${bulk.count === 1 ? '' : 's'}?`}
        message="This will permanently remove the selected ticker items."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
