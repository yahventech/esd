// EASD Admin — Teams used by matches.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Upload, X as XIcon, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextArea, TextInput, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const FLAG_PRESETS = [
  '🇰🇪', '🇺🇬', '🇹🇿', '🇷🇼', '🇧🇮', '🇸🇸', '🇪🇹', '🇸🇴', '🇪🇷', '🇩🇯',
  '🏴', '⚽', '🏉', '🏀', '🏐', '🏏',
];

const blank = {
  name: '', flag: '', short_name: '', category: '', primary_competition: '',
  country: '', founded: '', stadium: '', manager: '',
  primary_color: '', website: '', description: '',
};

function TeamBadge({ team, size = 40 }) {
  if (team.logo_url) {
    return (
      <img
        src={team.logo_url}
        alt={team.name}
        className="rounded-md object-cover bg-white/5"
        style={{ width: size, height: size }}
      />
    );
  }
  if (team.flag) {
    return <span style={{ fontSize: size * 0.7 }}>{team.flag}</span>;
  }
  return (
    <div
      className="rounded-md flex items-center justify-center bg-gold/10 text-gold font-display text-xs font-bold uppercase"
      style={{ width: size, height: size }}
    >
      {(team.short_name || team.name || '?').slice(0, 3)}
    </div>
  );
}

function TeamForm({ editing, categories, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [clearLogo, setClearLogo] = useState(false);
  const [competitions, setCompetitions] = useState([]);
  const fileRef = useRef(null);
  const isEdit = Boolean(editing?.slug);

  // Load competitions once so the league dropdown can filter by the picked
  // sport without a second round-trip per category change.
  useEffect(() => {
    let alive = true;
    api.admin.competitions.list()
      .then((res) => {
        if (!alive) return;
        setCompetitions(Array.isArray(res) ? res : (res?.results || []));
      })
      .catch(() => { if (alive) setCompetitions([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      flag: editing.flag || '',
      short_name: editing.short_name || '',
      category: editing.category ?? '',
      primary_competition: editing.primary_competition ?? '',
      country: editing.country || '',
      founded: editing.founded ?? '',
      stadium: editing.stadium || '',
      manager: editing.manager || '',
      primary_color: editing.primary_color || '',
      website: editing.website || '',
      description: editing.description || '',
    } : blank);
    setLogoFile(null);
    setLogoPreview(editing?.logo_url || '');
    setClearLogo(false);
  }, [editing]);

  const categoryOptions = useMemo(() => [
    { value: '', label: '— No sport / generic —' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ], [categories]);

  // Filter competitions by the currently-picked sport so editors don't see a
  // wall of cross-sport leagues when adding e.g. a basketball team.
  const competitionOptions = useMemo(() => {
    const filtered = form.category
      ? competitions.filter((c) => String(c.category) === String(form.category) || !c.category)
      : competitions;
    return [
      { value: '', label: competitions.length ? '— No primary league —' : '— Create competitions in Stats tab first —' },
      ...filtered.map((c) => ({ value: c.id, label: c.category_name ? `${c.name} · ${c.category_name}` : c.name })),
    ];
  }, [competitions, form.category]);

  const pickFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.'); return;
    }
    setError('');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setClearLogo(false);
  };

  const clear = () => {
    setLogoFile(null);
    setLogoPreview('');
    setClearLogo(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const needsMultipart = logoFile || clearLogo;
      const fields = {
        name: form.name,
        flag: form.flag || '',
        short_name: form.short_name || '',
        category: form.category === '' ? null : Number(form.category),
        primary_competition: form.primary_competition === '' ? null : Number(form.primary_competition),
        country: form.country || '',
        founded: form.founded === '' ? null : Number(form.founded),
        stadium: form.stadium || '',
        manager: form.manager || '',
        primary_color: form.primary_color || '',
        website: form.website || '',
        description: form.description || '',
      };
      let payload;
      if (needsMultipart) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v == null) continue;
          fd.append(k, v);
        }
        if (logoFile) fd.append('logo', logoFile);
        else if (clearLogo) fd.append('logo', '');
        payload = fd;
      } else {
        payload = fields;
      }
      if (isEdit) {
        await api.admin.teams.update(editing.slug, payload);
        showToast.showSuccess('Team updated');
      } else {
        await api.admin.teams.create(payload);
        showToast.showSuccess('Team created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(v) => setField('name', v)} required placeholder="Harambee Stars" />
        </Field>
        <Field label="Sport" hint="Which sport's Teams page this club shows up on">
          <Select value={form.category} onChange={(v) => setField('category', v)} options={categoryOptions} />
        </Field>
      </div>

      <Field label="League / competition" hint="Drives the league grouping on the sport's Teams page. Optional for national sides.">
        <Select
          value={form.primary_competition}
          onChange={(v) => setField('primary_competition', v)}
          options={competitionOptions}
        />
      </Field>

      <Field label="Crest / logo" hint="PNG or SVG. Overrides the flag on cards when present.">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="preview" className="w-full h-full object-cover" />
            ) : form.flag ? (
              <span className="text-3xl">{form.flag}</span>
            ) : (
              <Shield size={22} className="text-gray-600" />
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
              <Upload size={13} /> {logoPreview ? 'Replace' : 'Upload'}
            </Button>
            {logoPreview && (
              <Button type="button" variant="ghost" onClick={clear}>
                <XIcon size={13} /> Remove
              </Button>
            )}
          </div>
        </div>
      </Field>

      <Field label="Flag / badge text" hint="Emoji, short text, or leave blank if using a logo">
        <TextInput
          value={form.flag}
          onChange={(v) => setField('flag', v)}
          placeholder="🇰🇪 or KEN"
          maxLength={16}
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {FLAG_PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField('flag', f)}
              className={`px-2 py-1 rounded border text-lg transition-colors ${
                form.flag === f
                  ? 'border-gold/60 bg-gold/10'
                  : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Short name" hint="e.g. KEN — used on compact match cards">
          <TextInput value={form.short_name} onChange={(v) => setField('short_name', v)} placeholder="KEN" />
        </Field>
        <Field label="Country">
          <TextInput value={form.country} onChange={(v) => setField('country', v)} placeholder="Kenya" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Founded" hint="Year">
          <TextInput type="number" value={form.founded} onChange={(v) => setField('founded', v)} placeholder="1960" />
        </Field>
        <Field label="Stadium">
          <TextInput value={form.stadium} onChange={(v) => setField('stadium', v)} placeholder="Nyayo National Stadium" />
        </Field>
        <Field label="Manager / coach">
          <TextInput value={form.manager} onChange={(v) => setField('manager', v)} placeholder="Engin Firat" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary color" hint="Hex used for the team page accent">
          <TextInput value={form.primary_color} onChange={(v) => setField('primary_color', v)} placeholder="#10B981" />
        </Field>
        <Field label="Website">
          <TextInput value={form.website} onChange={(v) => setField('website', v)} placeholder="https://example.com" />
        </Field>
      </div>

      <Field label="Description" hint="Shown in the Overview tab of the team page">
        <TextArea value={form.description} onChange={(v) => setField('description', v)}
          rows={4} placeholder="A short club bio…" />
      </Field>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create team'}</Button>
      </div>
    </form>
  );
}

export default function TeamsManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.teams.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load teams')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filter !== 'all') {
      if (filter === 'unassigned') out = out.filter((r) => !r.category);
      else out = out.filter((r) => r.category_slug === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((r) =>
        (r.name || '').toLowerCase().includes(q)
        || (r.country || '').toLowerCase().includes(q)
        || (r.short_name || '').toLowerCase().includes(q));
    }
    return out;
  }, [rows, filter, search]);

  const bulk = useBulkSelect(filteredRows);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.teams.remove(toDelete.slug);
      showToast.showSuccess('Team deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed. Team may be used in matches.')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.teams.remove(r.slug));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length} (teams used in matches cannot be deleted).`);
    else showToast.showSuccess(`Deleted ${ok} team${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-gray-500 font-body">{rows.length} teams · {rows.filter((r) => r.category).length} assigned to a sport</div>
          {filteredRows.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all teams"
              />
              Select all
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 w-56">
            <Search size={12} className="text-gray-500 shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams…"
              className="flex-1 bg-transparent outline-none text-[12px] font-body text-white placeholder-gray-500" />
          </div>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus size={14} /> New team
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'all', label: 'All sports', count: rows.length },
            { value: 'unassigned', label: 'Unassigned', count: rows.filter((r) => !r.category).length },
            ...categories.map((c) => ({
              value: c.slug,
              label: `${c.icon || ''} ${c.name}`.trim(),
              count: rows.filter((r) => r.category_slug === c.slug).length,
            })),
          ].map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setFilter(c.value)}
              className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors inline-flex items-center gap-1.5 ${
                filter === c.value
                  ? 'bg-gold/10 text-gold border-gold/40'
                  : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
              }`}
            >
              {c.label}
              <span className="opacity-70 tabular-nums">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="teams" />

      {loading ? <Spinner /> : !filteredRows.length ? (
        <EmptyState icon={<Shield size={28} />} title="No teams in this filter"
          hint="Add teams or change the sport filter." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredRows.map((t) => (
            <div key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border bg-navy-100/40 px-3 py-2.5 transition-colors ${
              bulk.isSelected(t.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <BulkCheckbox
                  checked={bulk.isSelected(t.id)}
                  onChange={() => bulk.toggle(t.id)}
                  ariaLabel={`Select ${t.name}`}
                />
                <TeamBadge team={t} size={36} />
                <div className="min-w-0">
                  <div className="text-sm text-white font-body truncate">{t.name}</div>
                  <div className="text-[11px] text-gray-500 font-body truncate">
                    {t.category_name ? (
                      <span className="text-gold/70">{t.category_name}</span>
                    ) : (
                      <span className="italic">Unassigned sport</span>
                    )}
                    {t.country && <span> · {t.country}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => { setEditing(t); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                <button type="button" onClick={() => setToDelete(t)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="lg" title={editing ? 'Edit team' : 'New team'}>
        <TeamForm editing={editing} categories={categories} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete team?"
        message={`This will remove "${toDelete?.name}". Matches using this team will block deletion.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} team${bulk.count === 1 ? '' : 's'}?`}
        message="Teams currently used in matches will be skipped."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
