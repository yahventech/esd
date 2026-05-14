// EASD Admin — Category sub-pages (nav dropdown entries).

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Layers, ChevronDown, Search } from 'lucide-react';
import { api } from '../../lib/api';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal,
  Select, Spinner, TextArea, TextInput, Toggle, apiErrorMessage, bulkRemove,
  useBulkSelect, useFormState,
} from './shared';

const SCOPE_BADGE = {
  local:         { label: 'Local',  cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  international: { label: 'Intl.',  cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  general:       { label: 'General', cls: 'bg-white/[0.04] text-gray-400 border-white/10' },
};

const KINDS = [
  { value: 'news',      label: 'News feed' },
  { value: 'scores',    label: 'Scores (live + results toggle)' },
  { value: 'results',   label: 'Results' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'fixtures',  label: 'Fixtures' },
  { value: 'standings', label: 'Standings' },
  { value: 'teams',     label: 'Teams' },
  { value: 'players',   label: 'Gossip (Players)' },
  { value: 'videos',    label: 'Videos' },
  { value: 'custom',    label: 'Custom page' },
];

const SCOPES = [
  { value: 'local',         label: 'Local (East Africa)' },
  { value: 'international', label: 'International' },
  { value: 'general',       label: 'General (both)' },
];

const blank = {
  category: '', name: '', kind: 'news', scope: 'general', icon: '',
  intro: '', body: '', tag_filter: '', order: 0, is_active: true,
};

function SectionForm({ editing, categories, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.id);

  useEffect(() => {
    setForm(editing ? {
      category: editing.category,
      name: editing.name || '',
      kind: editing.kind || 'news',
      scope: editing.scope || 'general',
      icon: editing.icon || '',
      intro: editing.intro || '',
      body: editing.body || '',
      tag_filter: editing.tag_filter || '',
      order: editing.order ?? 0,
      is_active: editing.is_active !== false,
    } : { ...blank, category: categories[0]?.id || '' });
  }, [editing, categories]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.category) { setError('Pick a parent category'); return; }
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError(''); setSaving(true);
    const payload = {
      ...form,
      category: Number(form.category),
      order: Number(form.order) || 0,
      tag_filter: form.tag_filter.trim().replace(/^#/, ''),
    };
    try {
      if (isEdit) {
        await api.admin.sections.update(editing.id, payload);
        showToast.showSuccess('Section updated');
      } else {
        await api.admin.sections.create(payload);
        showToast.showSuccess('Section created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Parent category" required>
          <Select value={form.category} onChange={(v) => setField('category', v)} options={catOptions} />
        </Field>
        <Field label="Kind" required hint="Drives the default layout">
          <Select value={form.kind} onChange={(v) => setField('kind', v)} options={KINDS} />
        </Field>
        <Field label="Scope" required hint="Which column it lives in inside the Sports mega-menu">
          <Select value={form.scope} onChange={(v) => setField('scope', v)} options={SCOPES} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Name" required hint="Shown in the top-nav dropdown">
            <TextInput value={form.name} onChange={(v) => setField('name', v)} required placeholder="Transfers" />
          </Field>
        </div>
        <Field label="Icon" hint="Optional emoji">
          <TextInput value={form.icon} onChange={(v) => setField('icon', v)} placeholder="🔁" />
        </Field>
      </div>
      <Field label="Intro" hint="Short tagline shown at the top of the page">
        <TextInput value={form.intro} onChange={(v) => setField('intro', v)}
          placeholder="Every signing, rumour and done-deal across East Africa" />
      </Field>
      <Field label="Tag filter" hint="Optional tag slug (e.g. 'transfers') to narrow the story feed">
        <TextInput value={form.tag_filter} onChange={(v) => setField('tag_filter', v)} placeholder="transfers" />
      </Field>
      {form.kind === 'custom' && (
        <Field label="Body" hint="Longform content rendered verbatim for custom pages">
          <TextArea value={form.body} onChange={(v) => setField('body', v)} rows={6} />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
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
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create section'}</Button>
      </div>
    </form>
  );
}

export default function SectionsManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [secs, cats] = await Promise.all([
        api.admin.sections.list(),
        api.admin.categories.list(),
      ]);
      setRows(Array.isArray(secs) ? secs : (secs?.results || []));
      setCategories(Array.isArray(cats) ? cats : (cats?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load sections')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.category_slug === filter);
  }, [rows, filter]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.sections.remove(toDelete.id);
      showToast.showSuccess('Section deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.sections.remove(r.id));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} section${ok === 1 ? '' : 's'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const toggleActive = async (row) => {
    try {
      await api.admin.sections.update(row.id, { is_active: !row.is_active });
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
  };

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});  // categorySlug -> bool

  // Bucket sections by sport so each sport gets its own card. Sports without
  // any sections still render so editors see the gap and can add to it.
  const grouped = useMemo(() => {
    const matchesSearch = (s) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (s.name || '').toLowerCase().includes(q)
        || (s.kind || '').toLowerCase().includes(q)
        || (s.intro || '').toLowerCase().includes(q);
    };
    return categories
      .filter((c) => filter === 'all' || c.slug === filter)
      .map((c) => {
        const sections = rows
          .filter((r) => r.category_slug === c.slug)
          .filter(matchesSearch)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
        return { category: c, sections };
      });
  }, [rows, categories, filter, search]);

  const totalSections = rows.length;
  const activeSections = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-4">
      {/* Toolbar: search, sport filter, create */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[12px] text-gray-500 font-body">
            {totalSections} section{totalSections === 1 ? '' : 's'} · {activeSections} active across {categories.length} sport{categories.length === 1 ? '' : 's'}
          </div>
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all sections"
              />
              Select all
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 w-56">
            <Search size={12} className="text-gray-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search section name, kind…"
              className="flex-1 bg-transparent outline-none text-[12px] font-body text-white placeholder-gray-500"
            />
          </div>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }} disabled={!categories.length}>
            <Plus size={14} /> New section
          </Button>
        </div>
      </div>

      {/* Sport filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors ${
              filter === 'all'
                ? 'bg-gold/10 text-gold border-gold/40'
                : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
            }`}
          >
            All sports
            <span className="ml-1.5 opacity-70 tabular-nums">{rows.length}</span>
          </button>
          {categories.map((c) => {
            const count = rows.filter((r) => r.category_slug === c.slug).length;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setFilter(c.slug)}
                className={`px-3 py-1 rounded-full text-[11px] font-display uppercase tracking-wider border transition-colors inline-flex items-center gap-1.5 ${
                  filter === c.slug
                    ? 'bg-gold/10 text-gold border-gold/40'
                    : 'bg-white/[0.03] text-gray-400 border-white/10 hover:border-gold/30'
                }`}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
                <span className="opacity-70 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <BulkActionBar count={bulk.count} onClear={bulk.clear} onDelete={() => setBulkConfirm(true)} label="sections" />

      {loading ? <Spinner /> : !categories.length ? (
        <EmptyState icon={<Layers size={28} />} title="No categories yet"
          hint="Create a sport from the Categories tab, then come back to add its sub-pages." />
      ) : (
        <div className="space-y-3">
          {grouped.map(({ category, sections }) => {
            const isCollapsed = collapsed[category.slug];
            const activeCount = sections.filter((s) => s.is_active).length;
            return (
              <div key={category.slug}
                className="rounded-xl border border-white/[0.06] bg-navy-100/30 overflow-hidden">
                {/* Sport header */}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [category.slug]: !c[category.slug] }))}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{ background: `linear-gradient(90deg, ${category.color}22, transparent 60%)` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="text-left">
                      <div className="font-display text-base text-white uppercase tracking-wider">
                        {category.name}
                      </div>
                      <div className="text-[11px] font-body text-gray-500">
                        {sections.length} section{sections.length === 1 ? '' : 's'} ·{' '}
                        <span className="text-emerald-400">{activeCount} active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(null);
                        setOpenForm(true);
                        // Pre-fill category in form via the existing prop pipeline.
                        // The form reads `editing.category` so we set it via the
                        // "new with default" path:
                        setTimeout(() => {
                          // (Form initialises blank when editing is null; the
                          //  Select still defaults to first category. Editors
                          //  pick the sport explicitly. Header button is a
                          //  shortcut to open the modal — they confirm sport.)
                        }, 0);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-display uppercase tracking-wider border border-white/10 text-gray-300 hover:text-gold hover:border-gold/30"
                    >
                      <Plus size={10} className="inline -mt-0.5" /> Add
                    </button>
                    <ChevronDown size={14}
                      className={`text-gray-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Sections table */}
                {!isCollapsed && (
                  sections.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-gray-500 font-body italic border-t border-white/[0.04]">
                      No sections under {category.name} yet.
                    </div>
                  ) : (
                    <div className="border-t border-white/[0.04] overflow-x-auto">
                      <table className="min-w-full text-[12px] font-body">
                        <thead className="bg-white/[0.02] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
                          <tr>
                            <th className="px-3 py-2 w-8"></th>
                            <th className="px-3 py-2">Section</th>
                            <th className="px-3 py-2">Kind</th>
                            <th className="px-3 py-2">Scope</th>
                            <th className="px-3 py-2 text-right">Order</th>
                            <th className="px-3 py-2 text-right">Status</th>
                            <th className="px-3 py-2 text-right">URL</th>
                            <th className="px-3 py-2 text-right w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {sections.map((r) => {
                            const scope = SCOPE_BADGE[r.scope || 'general'];
                            return (
                              <tr key={r.id}
                                className={`hover:bg-white/[0.02] transition-colors ${!r.is_active ? 'opacity-60' : ''}`}>
                                <td className="px-3 py-2">
                                  <BulkCheckbox
                                    checked={bulk.isSelected(r.id)}
                                    onChange={() => bulk.toggle(r.id)}
                                    ariaLabel={`Select ${r.name}`}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {r.icon && <span>{r.icon}</span>}
                                    <span className="font-display text-white text-[13px] truncate">{r.name}</span>
                                  </div>
                                  {r.intro && (
                                    <div className="text-[10px] text-gray-500 line-clamp-1">{r.intro}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gold/80 capitalize">{r.kind}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider border ${scope.cls}`}>
                                    {scope.label}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-400 tabular-nums">{r.order ?? 0}</td>
                                <td className="px-3 py-2 text-right">
                                  <button type="button" onClick={() => toggleActive(r)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-display uppercase tracking-wider border ${
                                      r.is_active
                                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                        : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                                    }`}>
                                    {r.is_active ? 'On' : 'Off'}
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-[10px] text-gray-600 truncate max-w-[160px]">
                                  /{r.category_slug}/{r.slug}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-0.5">
                                    <button type="button" title="Edit"
                                      onClick={() => { setEditing(r); setOpenForm(true); }}
                                      className="p-1 rounded text-gray-400 hover:text-gold hover:bg-gold/10">
                                      <Pencil size={12} />
                                    </button>
                                    <button type="button" title="Delete"
                                      onClick={() => setToDelete(r)}
                                      className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}
          {grouped.length === 0 && (
            <EmptyState icon={<Layers size={28} />} title="No matches"
              hint="No sections fit the current filter. Clear the search or sport filter." />
          )}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="md"
        title={editing ? 'Edit section' : 'New section'}>
        <SectionForm editing={editing} categories={categories} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete section?"
        message={`This removes the "${toDelete?.name}" sub-page from ${toDelete?.category_name}.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} section${bulk.count === 1 ? '' : 's'}?`}
        message="This removes the selected sub-pages from the top nav."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
