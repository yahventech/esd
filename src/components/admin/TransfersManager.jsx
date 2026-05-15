// EASD Admin — Transfer news manager.
//
// Each row is one transfer-window beat: a rumour, an "agreed", a "here we go",
// or a confirmed signing. The form is structured (player + clubs + status +
// fee) so editors don't have to wedge that data into a normal Story; the
// frontend reads the structured fields directly to render the transfer card.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, ArrowRightLeft, Upload, X as XIcon, Star, Flame,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextArea, TextInput, Toggle,
  apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const STATUS_OPTIONS = [
  { value: 'rumor',      label: 'Rumour' },
  { value: 'talks',      label: 'In talks' },
  { value: 'agreed',     label: 'Agreement reached' },
  { value: 'medical',    label: 'Medical scheduled' },
  { value: 'here_we_go', label: 'Here we go' },
  { value: 'completed',  label: 'Completed' },
  { value: 'loan',       label: 'Loan move' },
  { value: 'rejected',   label: 'Rejected / failed' },
];

const PUBLISH_STATUS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
];

const RELIABILITY = [1, 2, 3, 4, 5].map((n) => ({
  value: n, label: `${n} / 5 — ${['speculation', 'whisper', 'reported', 'expected', 'confirmed'][n - 1]}`,
}));

const blank = {
  player_name: '',
  from_club: '',
  to_club: '',
  transfer_status: 'rumor',
  fee: '',
  contract_length: '',
  reliability: 3,
  category: '',
  summary: '',
  body: '',
  source: '',
  source_url: '',
  is_featured: false,
  is_breaking: false,
  status: 'published',
};

// Status → small color pill used in the table + card pills.
const STATUS_PILL = {
  rumor:      { label: 'Rumour',     cls: 'bg-gray-500/10 text-gray-300 border-gray-500/20' },
  talks:      { label: 'In talks',   cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  agreed:     { label: 'Agreed',     cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  medical:    { label: 'Medical',    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  here_we_go: { label: 'Here we go', cls: 'bg-gold/20 text-gold border-gold/40' },
  completed:  { label: 'Done deal',  cls: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40' },
  loan:       { label: 'Loan',       cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-500/10 text-red-300 border-red-500/30' },
};

// Small helper for an image upload slot — used for player photo and both club
// logos. Keeps the form readable and lets each picker manage its own preview.
function ImagePicker({ label, hint, preview, onPick, onClear, square = true }) {
  const fileRef = useRef(null);
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className={`${square ? 'w-16 h-16' : 'w-28 h-16'} rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden flex items-center justify-center`}>
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-600 text-[10px] font-body">—</span>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
            }}
          />
          <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> {preview ? 'Replace' : 'Upload'}
          </Button>
          {preview && (
            <Button type="button" variant="ghost" onClick={() => { if (fileRef.current) fileRef.current.value = ''; onClear(); }}>
              <XIcon size={13} /> Remove
            </Button>
          )}
        </div>
      </div>
    </Field>
  );
}

function TransferForm({ editing, onSaved, onCancel, showToast }) {
  const { categories } = useAppData();
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Three independent file slots — each tracks its own staged file + clear-on-save flag.
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [clearPhoto, setClearPhoto] = useState(false);
  const [fromFile, setFromFile] = useState(null);
  const [fromPreview, setFromPreview] = useState('');
  const [clearFrom, setClearFrom] = useState(false);
  const [toFile, setToFile] = useState(null);
  const [toPreview, setToPreview] = useState('');
  const [clearTo, setClearTo] = useState(false);

  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      player_name: editing.player_name || '',
      from_club: editing.from_club || '',
      to_club: editing.to_club || '',
      transfer_status: editing.transfer_status || 'rumor',
      fee: editing.fee || '',
      contract_length: editing.contract_length || '',
      reliability: editing.reliability ?? 3,
      category: editing.category || '',
      summary: editing.summary || '',
      body: editing.body || '',
      source: editing.source || '',
      source_url: editing.source_url || '',
      is_featured: Boolean(editing.is_featured),
      is_breaking: Boolean(editing.is_breaking),
      status: editing.status || 'published',
    } : { ...blank, category: categories[0]?.id || '' });

    setPhotoFile(null); setPhotoPreview(editing?.player_photo_url || ''); setClearPhoto(false);
    setFromFile(null);  setFromPreview(editing?.from_club_logo_url || ''); setClearFrom(false);
    setToFile(null);    setToPreview(editing?.to_club_logo_url || '');   setClearTo(false);
  }, [editing, categories]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.player_name.trim()) { setError('Player name is required.'); return; }
    setError(''); setSaving(true);

    const base = {
      player_name: form.player_name.trim(),
      from_club: form.from_club.trim(),
      to_club: form.to_club.trim(),
      transfer_status: form.transfer_status,
      fee: form.fee.trim(),
      contract_length: form.contract_length.trim(),
      reliability: Number(form.reliability) || 3,
      category: form.category ? Number(form.category) : null,
      summary: form.summary,
      body: form.body,
      source: form.source.trim(),
      source_url: form.source_url.trim(),
      is_featured: form.is_featured,
      is_breaking: form.is_breaking,
      status: form.status,
    };

    const hasUpload = photoFile || clearPhoto || fromFile || clearFrom || toFile || clearTo;
    let payload;
    if (hasUpload) {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => {
        if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
        else if (v == null) fd.append(k, '');
        else fd.append(k, String(v));
      });
      if (photoFile) fd.append('player_photo', photoFile);
      else if (clearPhoto) fd.append('player_photo', '');
      if (fromFile) fd.append('from_club_logo', fromFile);
      else if (clearFrom) fd.append('from_club_logo', '');
      if (toFile) fd.append('to_club_logo', toFile);
      else if (clearTo) fd.append('to_club_logo', '');
      payload = fd;
    } else {
      payload = base;
    }

    try {
      if (isEdit) {
        await api.admin.transfers.update(editing.slug, payload);
        showToast.showSuccess('Transfer updated');
      } else {
        await api.admin.transfers.create(payload);
        showToast.showSuccess('Transfer published');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  const pickImage = (setFile, setPreview, setClear) => (file) => {
    if (!file.type.startsWith('image/')) { setError('Pick an image file.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('Image must be under 4 MB.'); return; }
    setError('');
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setClear(false);
  };

  const clearImage = (setFile, setPreview, setClear) => () => {
    setFile(null);
    setPreview('');
    setClear(true);
  };

  const categoryOpts = useMemo(
    () => [{ value: '', label: '— Pick sport —' }, ...categories.map((c) => ({ value: c.id, label: `${c.icon || '·'} ${c.name}` }))],
    [categories],
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Player" required>
          <TextInput value={form.player_name} onChange={(v) => setField('player_name', v)} placeholder="e.g. Michael Olunga" required />
        </Field>
        <Field label="Sport" required>
          <Select value={form.category} onChange={(v) => setField('category', v)} options={categoryOpts} />
        </Field>
      </div>

      <ImagePicker
        label="Player photo"
        hint="Optional headshot or action shot. Square crop works best."
        preview={photoPreview}
        onPick={pickImage(setPhotoFile, setPhotoPreview, setClearPhoto)}
        onClear={clearImage(setPhotoFile, setPhotoPreview, setClearPhoto)}
        square
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="From club" hint="Leave blank for free agents.">
          <TextInput value={form.from_club} onChange={(v) => setField('from_club', v)} placeholder="Selling club" />
        </Field>
        <Field label="To club" hint="Leave blank if not yet known.">
          <TextInput value={form.to_club} onChange={(v) => setField('to_club', v)} placeholder="Destination club" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ImagePicker
          label="From-club logo"
          preview={fromPreview}
          onPick={pickImage(setFromFile, setFromPreview, setClearFrom)}
          onClear={clearImage(setFromFile, setFromPreview, setClearFrom)}
        />
        <ImagePicker
          label="To-club logo"
          preview={toPreview}
          onPick={pickImage(setToFile, setToPreview, setClearTo)}
          onClear={clearImage(setToFile, setToPreview, setClearTo)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Status">
          <Select value={form.transfer_status} onChange={(v) => setField('transfer_status', v)} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Fee" hint="e.g. €85M, Free, Undisclosed">
          <TextInput value={form.fee} onChange={(v) => setField('fee', v)} placeholder="€85M" />
        </Field>
        <Field label="Contract" hint="e.g. 5 years, Until 2028">
          <TextInput value={form.contract_length} onChange={(v) => setField('contract_length', v)} placeholder="5 years" />
        </Field>
      </div>

      <Field label="Reliability" hint="How solid is this report?">
        <Select value={form.reliability} onChange={(v) => setField('reliability', Number(v))} options={RELIABILITY} />
      </Field>

      <Field label="Summary" hint="One-sentence blurb shown on cards.">
        <TextArea rows={2} value={form.summary} onChange={(v) => setField('summary', v)} placeholder="Striker close to signing a five-year deal after passing his medical." />
      </Field>

      <Field label="Body" hint="Full write-up. Plain text or markdown.">
        <TextArea rows={6} value={form.body} onChange={(v) => setField('body', v)} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Source" hint="Reporter or outlet, e.g. Fabrizio Romano">
          <TextInput value={form.source} onChange={(v) => setField('source', v)} placeholder="Fabrizio Romano" />
        </Field>
        <Field label="Source URL">
          <TextInput value={form.source_url} onChange={(v) => setField('source_url', v)} placeholder="https://…" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Publish state">
          <Select value={form.status} onChange={(v) => setField('status', v)} options={PUBLISH_STATUS} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_featured} onChange={(v) => setField('is_featured', v)} label="Featured" />
        </div>
        <div className="flex items-end">
          <Toggle value={form.is_breaking} onChange={(v) => setField('is_breaking', v)} label="Breaking" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Publish transfer'}</Button>
      </div>
    </form>
  );
}

export default function TransfersManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [filter, setFilter] = useState('all'); // all | published | drafts | featured | breaking
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.transfers.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load transfers')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === 'published') list = list.filter((r) => r.status === 'published');
    if (filter === 'drafts')    list = list.filter((r) => r.status === 'draft');
    if (filter === 'featured')  list = list.filter((r) => r.is_featured);
    if (filter === 'breaking')  list = list.filter((r) => r.is_breaking);
    if (categoryFilter !== 'all') list = list.filter((r) => String(r.category) === String(categoryFilter));
    return list;
  }, [rows, filter, categoryFilter]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.transfers.remove(toDelete.slug);
      showToast.showSuccess('Transfer deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.transfers.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} transfer${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const toggleFlag = async (row, key) => {
    try {
      await api.admin.transfers.update(row.slug, { [key]: !row[key] });
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[12px] text-gray-500 font-body">{rows.length} transfers</div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'published', 'drafts', 'featured', 'breaking'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider transition-colors ${
                  filter === f ? 'bg-gold/20 text-gold border border-gold/40' : 'bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white'
                }`}
              >{f}</button>
            ))}
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider bg-white/[0.03] border border-white/10 text-gray-300 hover:text-white"
            >
              <option value="all">All sports</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all transfers"
              />
              Select all
            </label>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New transfer
        </Button>
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="transfers" />

      {loading ? <Spinner /> : !filtered.length ? (
        <EmptyState
          icon={<ArrowRightLeft size={28} />}
          title="No transfer items"
          hint="Add a rumour, an agreement, or a confirmed signing."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const pill = STATUS_PILL[row.transfer_status] || STATUS_PILL.rumor;
            return (
              <div
                key={row.id}
                className={`flex items-center justify-between gap-3 rounded-xl border bg-navy-100/40 px-3 py-2.5 transition-colors ${
                  bulk.isSelected(row.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
                } ${row.status === 'published' ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <BulkCheckbox
                    checked={bulk.isSelected(row.id)}
                    onChange={() => bulk.toggle(row.id)}
                    ariaLabel={`Select ${row.player_name}`}
                  />
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-white/[0.03] shrink-0 flex items-center justify-center">
                    {row.player_photo_url ? (
                      <img src={row.player_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-[10px] text-gold/70 uppercase">
                        {row.player_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-gray-500 font-body flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider border ${pill.cls}`}>
                        {pill.label}
                      </span>
                      {row.category_name && (
                        <span className="text-gray-500">{row.category_icon} {row.category_name}</span>
                      )}
                      {row.is_breaking && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/30">
                          <Flame size={9} /> Breaking
                        </span>
                      )}
                      {row.is_featured && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-gold/10 text-gold border border-gold/20">
                          <Star size={9} /> Featured
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-white font-body truncate flex items-center gap-1.5">
                      <span className="truncate">{row.player_name}</span>
                      {(row.from_club || row.to_club) && (
                        <span className="text-gray-500 text-[12px] truncate">
                          {row.from_club || '—'} <ArrowRightLeft size={10} className="inline" /> {row.to_club || '—'}
                        </span>
                      )}
                      {row.fee && <span className="text-gold/70 font-mono text-[12px]">· {row.fee}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFlag(row, 'is_featured')}
                    title={row.is_featured ? 'Unpin' : 'Feature on home strip'}
                    className={`p-1.5 rounded transition-colors ${row.is_featured ? 'text-gold hover:bg-gold/10' : 'text-gray-500 hover:text-gold hover:bg-gold/10'}`}
                  >
                    <Star size={13} fill={row.is_featured ? '#FFD700' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(row); setOpenForm(true); }}
                    className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(row)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? 'Edit transfer' : 'New transfer'}>
        <TransferForm
          editing={editing}
          showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete transfer?"
        message={`This will permanently remove "${toDelete?.player_name}".`}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} transfer${bulk.count === 1 ? '' : 's'}?`}
        message="This will permanently remove the selected transfer-news items."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
