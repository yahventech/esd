// EASD Admin — Players CRUD. Powers the Squad tab on the public team page
// and feeds into PlayerSeasonStats records managed elsewhere.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, User as UserIcon, Upload, X as XIcon, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const POSITIONS = [
  { value: 'GK',    label: 'Goalkeeper' },
  { value: 'DEF',   label: 'Defender' },
  { value: 'MID',   label: 'Midfielder' },
  { value: 'FWD',   label: 'Forward' },
  { value: 'COACH', label: 'Coach / Manager' },
  { value: 'OTHER', label: 'Other' },
];

const blank = {
  name: '', team: '', position: 'MID', jersey_number: '',
  nationality: '', date_of_birth: '', height_cm: '', is_active: true,
};

function PlayerForm({ editing, teams, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [clearPhoto, setClearPhoto] = useState(false);
  const fileRef = useRef(null);
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      team: editing.team ?? '',
      position: editing.position || 'MID',
      jersey_number: editing.jersey_number ?? '',
      nationality: editing.nationality || '',
      date_of_birth: editing.date_of_birth || '',
      height_cm: editing.height_cm ?? '',
      is_active: editing.is_active !== false,
    } : blank);
    setPhotoFile(null);
    setPhotoPreview(editing?.photo_url || '');
    setClearPhoto(false);
  }, [editing]);

  const teamOptions = useMemo(() => [
    { value: '', label: '— No team —' },
    ...teams.map((t) => ({
      value: t.id,
      label: `${t.category_name ? `[${t.category_name}] ` : ''}${t.name}`,
    })),
  ], [teams]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const fields = {
      name: form.name,
      team: form.team === '' ? null : Number(form.team),
      position: form.position,
      jersey_number: form.jersey_number === '' ? null : Number(form.jersey_number),
      nationality: form.nationality || '',
      date_of_birth: form.date_of_birth || null,
      height_cm: form.height_cm === '' ? null : Number(form.height_cm),
      is_active: form.is_active,
    };
    try {
      const needsMultipart = photoFile || clearPhoto;
      let payload;
      if (needsMultipart) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v == null) continue;
          fd.append(k, v);
        }
        if (photoFile) fd.append('photo', photoFile);
        else if (clearPhoto) fd.append('photo', '');
        payload = fd;
      } else {
        payload = fields;
      }
      if (isEdit) {
        await api.admin.players.update(editing.slug, payload);
        showToast.showSuccess('Player updated');
      } else {
        await api.admin.players.create(payload);
        showToast.showSuccess('Player created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(v) => setField('name', v)} required placeholder="Michael Olunga" />
        </Field>
        <Field label="Team">
          <Select value={form.team} onChange={(v) => setField('team', v)} options={teamOptions} />
        </Field>
      </div>

      <Field label="Photo" hint="Square portrait works best.">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={22} className="text-gray-600" />
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
                if (f.size > 2 * 1024 * 1024) { setError('Image must be under 2 MB.'); return; }
                setError(''); setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); setClearPhoto(false);
              }} />
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> {photoPreview ? 'Replace' : 'Upload'}
            </Button>
            {photoPreview && (
              <Button type="button" variant="ghost"
                onClick={() => { setPhotoFile(null); setPhotoPreview(''); setClearPhoto(true); if (fileRef.current) fileRef.current.value = ''; }}>
                <XIcon size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Position" required>
          <Select value={form.position} onChange={(v) => setField('position', v)} options={POSITIONS} />
        </Field>
        <Field label="Jersey #">
          <TextInput type="number" value={form.jersey_number} onChange={(v) => setField('jersey_number', v)} placeholder="9" />
        </Field>
        <Field label="Nationality">
          <TextInput value={form.nationality} onChange={(v) => setField('nationality', v)} placeholder="Kenya" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Date of birth">
          <TextInput type="date" value={form.date_of_birth} onChange={(v) => setField('date_of_birth', v)} />
        </Field>
        <Field label="Height (cm)">
          <TextInput type="number" value={form.height_cm} onChange={(v) => setField('height_cm', v)} placeholder="180" />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_active} onChange={(v) => setField('is_active', v)} label="Active (in squad)" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create player'}</Button>
      </div>
    </form>
  );
}

export default function PlayersManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [filter, setFilter] = useState('all');         // sport slug
  const [posFilter, setPosFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ps, ts] = await Promise.all([api.admin.players.list(), api.admin.teams.list()]);
      setRows(Array.isArray(ps) ? ps : (ps?.results || []));
      setTeams(Array.isArray(ts) ? ts : (ts?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load players')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== 'all') {
      out = out.filter((p) => {
        const t = teamById.get(p.team);
        return t?.category_slug === filter;
      });
    }
    if (posFilter !== 'all') out = out.filter((p) => p.position === posFilter);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((p) =>
      (p.name || '').toLowerCase().includes(q)
      || (p.nationality || '').toLowerCase().includes(q)
      || (teamById.get(p.team)?.name || '').toLowerCase().includes(q));
    return out;
  }, [rows, filter, posFilter, search, teamById]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.players.remove(toDelete.slug);
      showToast.showSuccess('Player deleted');
      setToDelete(null); await load(); onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const targets = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(targets, (r) => api.admin.players.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} player${ok === 1 ? '' : 's'}.`);
    bulk.clear(); await load(); onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-gray-500 font-body">
          {rows.length} players · {rows.filter((r) => r.is_active).length} active · {teams.length} teams
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 w-56">
            <Search size={12} className="text-gray-500 shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players, teams…"
              className="flex-1 bg-transparent outline-none text-[12px] font-body text-white placeholder-gray-500" />
          </div>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!teams.length}>
            <Plus size={14} /> New player
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors ${
            filter === 'all'
              ? 'bg-gold/10 text-gold border-gold/40'
              : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
          }`}
        >All sports</button>
        {categories.map((c) => (
          <button key={c.slug} type="button" onClick={() => setFilter(c.slug)}
            className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors inline-flex items-center gap-1.5 ${
              filter === c.slug
                ? 'bg-gold/10 text-gold border-gold/40'
                : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
            }`}>
            {c.icon && <span>{c.icon}</span>}{c.name}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[10px] uppercase tracking-wider font-display text-gray-500 mr-1">Position</span>
        {[{ value: 'all', label: 'All' }, ...POSITIONS].map((p) => (
          <button key={p.value} type="button" onClick={() => setPosFilter(p.value)}
            className={`px-2.5 py-1 rounded-full font-display text-[10px] uppercase tracking-wider border transition-colors ${
              posFilter === p.value
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/[0.02] border border-white/10 text-gray-400 hover:text-white'
            }`}>{p.label}</button>
        ))}
      </div>

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="players" />

      {loading ? <Spinner /> : !teams.length ? (
        <EmptyState icon={<UserIcon size={28} />} title="Add a team first"
          hint="Players must belong to a team. Create teams in the Teams tab and come back." />
      ) : !filtered.length ? (
        <EmptyState icon={<UserIcon size={28} />} title="No players in this filter"
          hint="Add a player or change the filters." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((p) => {
            const team = teamById.get(p.team);
            return (
              <div key={p.id} className={`flex items-center justify-between gap-3 rounded-lg border bg-navy-100/40 px-3 py-2.5 transition-colors ${
                bulk.isSelected(p.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
              } ${!p.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <BulkCheckbox checked={bulk.isSelected(p.id)} onChange={() => bulk.toggle(p.id)}
                    ariaLabel={`Select ${p.name}`} />
                  <div className="w-9 h-9 shrink-0 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={14} className="text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate flex items-center gap-1.5">
                      {p.name}
                      {p.jersey_number != null && (
                        <span className="text-[10px] font-mono text-gold/80">#{p.jersey_number}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-body truncate">
                      <span className="text-gold/70">{p.position}</span>
                      {team && <span> · {team.name}</span>}
                      {p.nationality && <span> · {p.nationality}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => { setEditing(p); setOpenForm(true); }}
                    className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                  <button type="button" onClick={() => setToDelete(p)}
                    className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="lg"
        title={editing ? 'Edit player' : 'New player'}>
        <PlayerForm editing={editing} teams={teams} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete player?"
        message={`This will remove ${toDelete?.name}.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} player${bulk.count === 1 ? '' : 's'}?`}
        message="This will permanently remove the selected players and their stats rows."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
