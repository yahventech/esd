// EASD Admin — Stats hub.
// Manages the four building blocks behind the public Team / Player stats pages:
//   Seasons       — "2024/25" timeline buckets
//   Competitions  — leagues / cups grouped by sport (Premier League under Football)
//   Team stats    — per-season league record per team per competition
//   Player stats  — per-season totals per player per competition
//
// Built as a single tab with four sub-tabs to keep the navigation tidy.

import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Pencil, Trash2, Calendar, Trophy, BarChart3, Users,
  Save, ListOrdered,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppData } from '../../context/AppDataContext';
import {
  Button, ConfirmDialog, EmptyState, Field, Modal, Select, Spinner,
  TextInput, Toggle, apiErrorMessage, useFormState,
} from './shared';

const SUB_TABS = [
  { id: 'standings',     label: 'Standings',    icon: ListOrdered },
  { id: 'seasons',       label: 'Seasons',      icon: Calendar },
  { id: 'competitions',  label: 'Competitions', icon: Trophy },
  { id: 'team-stats',    label: 'Team stats',   icon: BarChart3 },
  { id: 'player-stats',  label: 'Player stats', icon: Users },
];

const TEAM_STAT_FIELDS = [
  ['played', 'P'], ['wins', 'W'], ['draws', 'D'], ['losses', 'L'],
  ['goals_for', 'GF'], ['goals_against', 'GA'], ['clean_sheets', 'CS'],
  ['points', 'Pts'], ['position', 'Pos'],
];

const PLAYER_STAT_FIELDS = [
  ['appearances', 'Apps'], ['starts', 'Starts'], ['minutes', 'Mins'],
  ['goals', 'Goals'], ['assists', 'Assists'],
  ['yellow_cards', 'Yellow'], ['red_cards', 'Red'], ['clean_sheets', 'CS'],
];

// ─────────────────────── Seasons sub-tab ──────────────────────────

function SeasonForm({ editing, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState({
    name: '', start_date: '', end_date: '', is_current: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      start_date: editing.start_date || '',
      end_date: editing.end_date || '',
      is_current: !!editing.is_current,
    } : { name: '', start_date: '', end_date: '', is_current: false });
  }, [editing]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = {
        name: form.name,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_current: form.is_current,
      };
      if (isEdit) {
        await api.admin.seasons.update(editing.slug, payload);
        showToast.showSuccess('Season updated');
      } else {
        await api.admin.seasons.create(payload);
        showToast.showSuccess('Season created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Name" required hint="e.g. 2024/25">
        <TextInput value={form.name} onChange={(v) => setField('name', v)} required placeholder="2024/25" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <TextInput type="date" value={form.start_date} onChange={(v) => setField('start_date', v)} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={form.end_date} onChange={(v) => setField('end_date', v)} />
        </Field>
      </div>
      <Toggle value={form.is_current} onChange={(v) => setField('is_current', v)}
        label="Current season (only one can be 'current')" />
      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save' : 'Create season'}</Button>
      </div>
    </form>
  );
}

function SeasonsPanel({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows((await api.admin.seasons.list()) || []); }
    catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load seasons')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-gray-500 font-body">{rows.length} season{rows.length === 1 ? '' : 's'}</div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New season
        </Button>
      </div>
      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<Calendar size={28} />} title="No seasons yet"
          hint="Add at least one season (e.g. 2024/25) before recording stats." />
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="min-w-full text-[13px] font-body">
            <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Start</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2 text-right w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 text-white">{s.name}</td>
                  <td className="px-3 py-2 text-gray-400">{s.start_date || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{s.end_date || '—'}</td>
                  <td className="px-3 py-2">
                    {s.is_current && <span className="px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Current</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-0.5">
                      <button type="button" onClick={() => { setEditing(s); setOpenForm(true); }}
                        className="p-1 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                      <button type="button" onClick={() => setToDelete(s)}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm" title={editing ? 'Edit season' : 'New season'}>
        <SeasonForm editing={editing} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete season?"
        message={`This will remove "${toDelete?.name}" and any stats rows linked to it.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await api.admin.seasons.remove(toDelete.slug);
            showToast.showSuccess('Season deleted');
            setToDelete(null); await load(); onDataChanged?.();
          } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
        }} />
    </div>
  );
}

// ─────────────────────── Competitions sub-tab ───────────────────────

const SCOPE_OPTIONS = [
  { value: 'local', label: 'Local (East Africa)' },
  { value: 'international', label: 'International' },
];

function CompetitionForm({ editing, categories, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState({
    name: '', category: '', country: '', scope: 'international', is_active: true, order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.slug);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      category: editing.category ?? '',
      country: editing.country || '',
      scope: editing.scope || 'international',
      is_active: editing.is_active !== false,
      order: editing.order ?? 0,
    } : { name: '', category: '', country: '', scope: 'international', is_active: true, order: 0 });
  }, [editing]);

  const catOpts = useMemo(() => [
    { value: '', label: '— No sport —' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon || ''} ${c.name}`.trim() })),
  ], [categories]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category === '' ? null : Number(form.category),
        country: form.country,
        scope: form.scope,
        is_active: form.is_active,
        order: Number(form.order) || 0,
      };
      if (isEdit) {
        await api.admin.competitions.update(editing.slug, payload);
        showToast.showSuccess('Competition updated');
      } else {
        await api.admin.competitions.create(payload);
        showToast.showSuccess('Competition created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Name" required>
        <TextInput value={form.name} onChange={(v) => setField('name', v)} required placeholder="Kenya Premier League" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sport">
          <Select value={form.category} onChange={(v) => setField('category', v)} options={catOpts} />
        </Field>
        <Field label="Scope">
          <Select value={form.scope} onChange={(v) => setField('scope', v)} options={SCOPE_OPTIONS} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Country">
          <TextInput value={form.country} onChange={(v) => setField('country', v)} placeholder="Kenya" />
        </Field>
        <Field label="Order">
          <TextInput type="number" value={form.order} onChange={(v) => setField('order', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_active} onChange={(v) => setField('is_active', v)} label="Active" />
        </div>
      </div>
      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save' : 'Create competition'}</Button>
      </div>
    </form>
  );
}

function CompetitionsPanel({ categories, showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRows((await api.admin.competitions.list()) || []); }
    catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load competitions')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[12px] text-gray-500 font-body">{rows.length} competition{rows.length === 1 ? '' : 's'}</div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
          <Plus size={14} /> New competition
        </Button>
      </div>
      {loading ? <Spinner /> : !rows.length ? (
        <EmptyState icon={<Trophy size={28} />} title="No competitions"
          hint="Add the leagues and cups you track, then attach team/player stats to them." />
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="min-w-full text-[13px] font-body">
            <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Sport</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2 text-right w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((c) => (
                <tr key={c.id} className={`hover:bg-white/[0.02] ${!c.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2 text-white">{c.name}</td>
                  <td className="px-3 py-2 text-gold/80">{c.category_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{c.country || '—'}</td>
                  <td className="px-3 py-2 capitalize text-gray-400">{c.scope}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider border ${
                      c.is_active
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                    }`}>{c.is_active ? 'On' : 'Off'}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-0.5">
                      <button type="button" onClick={() => { setEditing(c); setOpenForm(true); }}
                        className="p-1 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                      <button type="button" onClick={() => setToDelete(c)}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={openForm} onClose={() => setOpenForm(false)} size="sm" title={editing ? 'Edit competition' : 'New competition'}>
        <CompetitionForm editing={editing} categories={categories} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete competition?"
        message={`This will remove "${toDelete?.name}" and any stats rows linked to it.`}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await api.admin.competitions.remove(toDelete.slug);
            showToast.showSuccess('Competition deleted');
            setToDelete(null); await load(); onDataChanged?.();
          } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
        }} />
    </div>
  );
}

// ─────────────────────── Team stats sub-tab ───────────────────────

function StatRowForm({ kind, editing, teams, players, seasons, competitions, onSaved, onCancel, showToast }) {
  const isTeam = kind === 'team';
  const fields = isTeam ? TEAM_STAT_FIELDS : PLAYER_STAT_FIELDS;
  const [form, setField, setForm] = useFormState({
    target: '', season: '', competition: '',
    ...Object.fromEntries(fields.map(([k]) => [k, 0])),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.id);

  useEffect(() => {
    if (editing) {
      const next = { target: isTeam ? editing.team : editing.player, season: editing.season, competition: editing.competition ?? '' };
      for (const [k] of fields) next[k] = editing[k] ?? 0;
      setForm(next);
    } else {
      setForm({
        target: '', season: '', competition: '',
        ...Object.fromEntries(fields.map(([k]) => [k, 0])),
      });
    }
  }, [editing, isTeam]);

  const targetOpts = isTeam
    ? [{ value: '', label: '— Pick team —' }, ...teams.map((t) => ({ value: t.id, label: t.category_name ? `[${t.category_name}] ${t.name}` : t.name }))]
    : [{ value: '', label: '— Pick player —' }, ...players.map((p) => ({ value: p.id, label: `${p.name}${p.team_name ? ` (${p.team_name})` : ''}` }))];
  const seasonOpts = [{ value: '', label: '— Pick season —' }, ...seasons.map((s) => ({ value: s.id, label: s.name }))];
  const compOpts = [{ value: '', label: 'Career / cross-competition' }, ...competitions.map((c) => ({ value: c.id, label: c.category_name ? `[${c.category_name}] ${c.name}` : c.name }))];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.target || !form.season) { setError(`Pick a ${isTeam ? 'team' : 'player'} and a season.`); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        [isTeam ? 'team' : 'player']: Number(form.target),
        season: Number(form.season),
        competition: form.competition === '' ? null : Number(form.competition),
      };
      for (const [k] of fields) {
        const v = form[k];
        if (v === '' || v == null) continue;
        payload[k] = Number(v);
      }
      const target = isTeam ? api.admin.teamStats : api.admin.playerStats;
      if (isEdit) {
        await target.update(editing.id, payload);
        showToast.showSuccess('Stats updated');
      } else {
        await target.create(payload);
        showToast.showSuccess('Stats added');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Field label={isTeam ? 'Team' : 'Player'} required>
          <Select value={form.target} onChange={(v) => setField('target', v)} options={targetOpts} />
        </Field>
        <Field label="Season" required>
          <Select value={form.season} onChange={(v) => setField('season', v)} options={seasonOpts} />
        </Field>
        <Field label="Competition">
          <Select value={form.competition} onChange={(v) => setField('competition', v)} options={compOpts} />
        </Field>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {fields.map(([k, label]) => (
          <Field key={k} label={label}>
            <TextInput type="number" value={form[k]} onChange={(v) => setField(k, v)} />
          </Field>
        ))}
      </div>
      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save' : 'Add row'}</Button>
      </div>
    </form>
  );
}

function StatsTable({ kind, rows, fields, onEdit, onDelete }) {
  const isTeam = kind === 'team';
  if (!rows.length) {
    return (
      <EmptyState icon={<BarChart3 size={28} />} title={`No ${isTeam ? 'team' : 'player'} stats yet`}
        hint={`Add a row to record ${isTeam ? 'wins, losses and points' : 'goals, assists and minutes'} per season.`} />
    );
  }
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
      <table className="min-w-full text-[13px] font-body">
        <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
          <tr>
            <th className="px-3 py-2">{isTeam ? 'Team' : 'Player'}</th>
            <th className="px-3 py-2">Season</th>
            <th className="px-3 py-2">Competition</th>
            {fields.map(([k, label]) => (
              <th key={k} className="px-2 py-2 text-right">{label}</th>
            ))}
            <th className="px-3 py-2 text-right w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-white/[0.02]">
              <td className="px-3 py-2 text-white">{isTeam ? r.team_name : r.player_name}</td>
              <td className="px-3 py-2 text-gray-300">{r.season_name}</td>
              <td className="px-3 py-2 text-gray-400">{r.competition_name || 'All'}</td>
              {fields.map(([k]) => (
                <td key={k} className="px-2 py-2 text-right tabular-nums text-gray-300">{r[k] ?? 0}</td>
              ))}
              <td className="px-3 py-2 text-right">
                <div className="flex justify-end gap-0.5">
                  <button type="button" onClick={() => onEdit(r)} className="p-1 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={12} /></button>
                  <button type="button" onClick={() => onDelete(r)} className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamOrPlayerStatsPanel({ kind, teams, players, seasons, competitions, showToast, onDataChanged }) {
  const isTeam = kind === 'team';
  const fields = isTeam ? TEAM_STAT_FIELDS : PLAYER_STAT_FIELDS;
  const apiTarget = isTeam ? api.admin.teamStats : api.admin.playerStats;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [seasonFilter, setSeasonFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try { setRows((await apiTarget.list()) || []); }
    catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load stats')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [kind]);

  const filtered = useMemo(() => {
    if (seasonFilter === 'all') return rows;
    return rows.filter((r) => r.season_slug === seasonFilter);
  }, [rows, seasonFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-gray-500 font-body">{rows.length} row{rows.length === 1 ? '' : 's'}</div>
        <div className="flex gap-2 items-center">
          <Select value={seasonFilter} onChange={setSeasonFilter}
            options={[{ value: 'all', label: 'All seasons' }, ...seasons.map((s) => ({ value: s.slug, label: s.name }))]} />
          <Button onClick={() => { setEditing(null); setOpenForm(true); }}
            disabled={!seasons.length || (isTeam ? !teams.length : !players.length)}>
            <Plus size={14} /> Add row
          </Button>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <StatsTable kind={kind} rows={filtered} fields={fields}
          onEdit={(r) => { setEditing(r); setOpenForm(true); }}
          onDelete={(r) => setToDelete(r)} />
      )}
      <Modal open={openForm} onClose={() => setOpenForm(false)} size="lg"
        title={editing ? 'Edit stats row' : `Add ${isTeam ? 'team' : 'player'} stats row`}>
        <StatRowForm kind={kind} editing={editing}
          teams={teams} players={players} seasons={seasons} competitions={competitions}
          showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete stats row?"
        message="This permanently removes the season totals for this team/player + season."
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await apiTarget.remove(toDelete.id);
            showToast.showSuccess('Stats row deleted');
            setToDelete(null); await load(); onDataChanged?.();
          } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
        }} />
    </div>
  );
}

// ─────────────────────── Standings sub-tab ───────────────────────

const STANDINGS_COLUMNS = [
  ['position',       'Pos', 3],
  ['played',         'P',   3],
  ['wins',           'W',   3],
  ['draws',          'D',   3],
  ['losses',         'L',   3],
  ['goals_for',      'GF',  4],
  ['goals_against',  'GA',  4],
  ['clean_sheets',   'CS',  3],
  ['points',         'Pts', 4],
];

function StandingsPanel({ teams, seasons, competitions, showToast, onDataChanged }) {
  const [competitionId, setCompetitionId] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [serverRows, setServerRows] = useState([]);   // last-loaded snapshot
  const [draft, setDraft] = useState({});             // rowId | tempKey -> editable values
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addTeamId, setAddTeamId] = useState('');
  const [toDelete, setToDelete] = useState(null);

  // Default the selects to the most useful pair on mount.
  useEffect(() => {
    if (!competitionId && competitions.length) setCompetitionId(String(competitions[0].id));
    if (!seasonId && seasons.length) {
      const current = seasons.find((s) => s.is_current);
      setSeasonId(String((current || seasons[0]).id));
    }
  }, [competitions, seasons]);

  const competition = useMemo(
    () => competitions.find((c) => String(c.id) === String(competitionId)),
    [competitions, competitionId],
  );
  const season = useMemo(
    () => seasons.find((s) => String(s.id) === String(seasonId)),
    [seasons, seasonId],
  );

  // Only teams in the same sport as the picked competition are listed for
  // adding to standings — saves the editor scrolling 600 unrelated rows.
  const sportTeams = useMemo(() => {
    if (!competition) return [];
    return teams.filter((t) => t.category_slug === competition.category_slug);
  }, [teams, competition]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Fetch current rows whenever the picker changes.
  const reload = async () => {
    if (!competitionId || !seasonId) { setServerRows([]); setDraft({}); return; }
    setLoading(true);
    try {
      const params = `competition=${competitionId}&season=${seasonId}`;
      const res = await api.admin.teamStats.list(params);
      const list = Array.isArray(res) ? res : (res?.results || []);
      list.sort((a, b) => {
        if (a.position != null && b.position != null) return a.position - b.position;
        return (b.points - a.points) || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
      });
      setServerRows(list);
      // Reset the draft to a fresh copy of server data.
      const fresh = {};
      for (const r of list) {
        fresh[r.id] = {
          team: r.team,
          position: r.position ?? '',
          played: r.played, wins: r.wins, draws: r.draws, losses: r.losses,
          goals_for: r.goals_for, goals_against: r.goals_against,
          clean_sheets: r.clean_sheets, points: r.points,
        };
      }
      setDraft(fresh);
    } catch (e) {
      showToast.showError(apiErrorMessage(e, 'Could not load standings'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [competitionId, seasonId]);

  // Track which rows differ from server state so Save only PATCHes dirty ones.
  const dirtyIds = useMemo(() => {
    const ids = new Set();
    for (const r of serverRows) {
      const d = draft[r.id];
      if (!d) continue;
      for (const [k] of STANDINGS_COLUMNS) {
        const server = k === 'position' ? (r[k] ?? '') : r[k];
        const local = d[k];
        if (String(server) !== String(local)) { ids.add(r.id); break; }
      }
    }
    // Tempkeys (new rows) are always dirty.
    for (const key of Object.keys(draft)) {
      if (typeof key === 'string' && key.startsWith('new-')) ids.add(key);
    }
    return ids;
  }, [draft, serverRows]);

  const setCell = (rowId, key, value) => {
    setDraft((d) => ({ ...d, [rowId]: { ...d[rowId], [key]: value } }));
  };

  const addRow = () => {
    if (!addTeamId) return;
    if (Object.values(draft).some((r) => String(r.team) === String(addTeamId))) {
      showToast.showError('That team already has a row in this standing.');
      return;
    }
    const tempKey = `new-${Date.now()}`;
    setDraft((d) => ({
      ...d,
      [tempKey]: {
        team: Number(addTeamId), position: '',
        played: 0, wins: 0, draws: 0, losses: 0,
        goals_for: 0, goals_against: 0, clean_sheets: 0, points: 0,
      },
    }));
    setAddTeamId('');
  };

  const removeRow = async () => {
    if (!toDelete) return;
    try {
      if (typeof toDelete === 'string' && toDelete.startsWith('new-')) {
        // Unsaved new row — just drop from draft.
        setDraft((d) => { const c = { ...d }; delete c[toDelete]; return c; });
      } else {
        await api.admin.teamStats.remove(toDelete);
        showToast.showSuccess('Row removed');
      }
      setToDelete(null);
      await reload();
      onDataChanged?.();
    } catch (e) {
      showToast.showError(apiErrorMessage(e, 'Delete failed'));
    }
  };

  const recalcFromMatches = async () => {
    if (!competition || !season) return;
    setSaving(true);
    try {
      const r = await api.admin.teamStats.recalculate(competition.id, season.id);
      showToast.showSuccess(
        `Recalculated from ${r.matches} match${r.matches === 1 ? '' : 'es'} · ${r.created} new · ${r.updated} updated.`
      );
      await reload();
      onDataChanged?.();
    } catch (e) {
      showToast.showError(apiErrorMessage(e, 'Recalculate failed'));
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    if (!competition || !season) return;
    setSaving(true);
    const toCreate = [];
    const toUpdate = [];
    for (const key of dirtyIds) {
      const d = draft[key];
      const payload = {
        season: season.id, competition: competition.id, team: d.team,
        position: d.position === '' ? null : Number(d.position),
        played: Number(d.played) || 0, wins: Number(d.wins) || 0,
        draws: Number(d.draws) || 0, losses: Number(d.losses) || 0,
        goals_for: Number(d.goals_for) || 0, goals_against: Number(d.goals_against) || 0,
        clean_sheets: Number(d.clean_sheets) || 0, points: Number(d.points) || 0,
      };
      if (typeof key === 'string' && key.startsWith('new-')) toCreate.push(payload);
      else toUpdate.push({ id: key, payload });
    }
    try {
      await Promise.all([
        ...toCreate.map((p) => api.admin.teamStats.create(p)),
        ...toUpdate.map(({ id, payload }) => api.admin.teamStats.update(id, payload)),
      ]);
      showToast.showSuccess(`Saved ${toCreate.length + toUpdate.length} row${toCreate.length + toUpdate.length === 1 ? '' : 's'}.`);
      await reload();
      onDataChanged?.();
    } catch (e) {
      showToast.showError(apiErrorMessage(e, 'Save failed — check the console for details.'));
    } finally {
      setSaving(false);
    }
  };

  const rowsToRender = useMemo(() => {
    const out = [];
    for (const r of serverRows) {
      out.push({ key: r.id, isNew: false, draft: draft[r.id] || {} });
    }
    for (const key of Object.keys(draft)) {
      if (typeof key === 'string' && key.startsWith('new-')) {
        out.push({ key, isNew: true, draft: draft[key] });
      }
    }
    // Sort by the draft's position field (falls back to original order).
    out.sort((a, b) => {
      const ap = a.draft.position === '' || a.draft.position == null ? 999 : Number(a.draft.position);
      const bp = b.draft.position === '' || b.draft.position == null ? 999 : Number(b.draft.position);
      return ap - bp;
    });
    return out;
  }, [serverRows, draft]);

  const compOpts = competitions.map((c) => ({
    value: String(c.id),
    label: `${c.category_name ? `[${c.category_name}] ` : ''}${c.name}`,
  }));
  const seasonOpts = seasons.map((s) => ({
    value: String(s.id),
    label: `${s.name}${s.is_current ? ' (current)' : ''}`,
  }));
  const addTeamOpts = useMemo(() => {
    const taken = new Set(Object.values(draft).map((d) => d.team));
    return [
      { value: '', label: '— Pick a team to add —' },
      ...sportTeams
        .filter((t) => !taken.has(t.id))
        .map((t) => ({ value: t.id, label: t.name })),
    ];
  }, [sportTeams, draft]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Competition" hint="">
            <Select value={competitionId} onChange={setCompetitionId} options={compOpts} />
          </Field>
          <Field label="Season" hint="">
            <Select value={seasonId} onChange={setSeasonId} options={seasonOpts} />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={recalcFromMatches} disabled={!competition || !season}>
            Recalc from matches
          </Button>
          <Button onClick={saveAll} disabled={saving || dirtyIds.size === 0 || !competition || !season}>
            <Save size={13} /> {saving ? 'Saving…' : `Save ${dirtyIds.size || ''} change${dirtyIds.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>

      {!competitions.length ? (
        <EmptyState icon={<Trophy size={28} />} title="Add a competition first"
          hint="Standings live inside a competition. Add a Premier League / KPL row from the Competitions tab and come back." />
      ) : !seasons.length ? (
        <EmptyState icon={<Calendar size={28} />} title="Add a season first"
          hint="Add a season (e.g. 2024/25) from the Seasons tab so we know which window these standings cover." />
      ) : loading ? (
        <Spinner />
      ) : (
        <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
          <table className="min-w-full text-[13px] font-body">
            <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-wider text-gray-500 font-display">
              <tr>
                <th className="px-3 py-2">Team</th>
                {STANDINGS_COLUMNS.map(([k, label]) => (
                  <th key={k} className="px-2 py-2 text-right">{label}</th>
                ))}
                <th className="px-3 py-2 text-right">GD</th>
                <th className="px-3 py-2 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rowsToRender.length === 0 ? (
                <tr>
                  <td colSpan={STANDINGS_COLUMNS.length + 3} className="px-3 py-12 text-center text-gray-500 font-body italic">
                    No rows yet — add a team below to start the standings.
                  </td>
                </tr>
              ) : rowsToRender.map(({ key, isNew, draft: d }) => {
                const team = teamById.get(d.team);
                const gd = (Number(d.goals_for) || 0) - (Number(d.goals_against) || 0);
                const isDirty = dirtyIds.has(key);
                return (
                  <tr key={key} className={`${isNew ? 'bg-emerald-500/[0.04]' : ''} ${isDirty && !isNew ? 'bg-gold/[0.03]' : ''} hover:bg-white/[0.02]`}>
                    <td className="px-3 py-1.5 font-display text-white truncate max-w-xs">
                      {team ? team.name : <span className="text-gray-500 italic">Unknown team</span>}
                      {isNew && <span className="ml-2 text-[9px] uppercase tracking-wider text-emerald-300">NEW</span>}
                    </td>
                    {STANDINGS_COLUMNS.map(([k, label, width]) => (
                      <td key={k} className="px-1 py-1 text-right">
                        <input
                          type="number"
                          value={d[k] ?? (k === 'position' ? '' : 0)}
                          onChange={(e) => setCell(key, k, e.target.value === '' ? '' : e.target.value)}
                          className={`w-12 px-1 py-0.5 rounded bg-transparent border border-transparent hover:border-white/10 focus:border-gold/40 outline-none text-right tabular-nums text-white font-body text-[12px] ${k === 'points' ? 'text-gold font-bold' : ''}`}
                          style={{ width: `${width * 1.2}rem` }}
                        />
                      </td>
                    ))}
                    <td className={`px-3 py-1.5 text-right tabular-nums ${gd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {gd > 0 ? '+' : ''}{gd}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button type="button" onClick={() => setToDelete(key)}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add-team row */}
          <div className="border-t border-white/[0.06] bg-white/[0.015] p-3 flex items-center gap-2">
            <Select value={addTeamId} onChange={setAddTeamId} options={addTeamOpts} />
            <Button variant="ghost" onClick={addRow} disabled={!addTeamId}>
              <Plus size={13} /> Add team
            </Button>
            {dirtyIds.size > 0 && (
              <span className="ml-auto text-[11px] font-body text-gold">
                {dirtyIds.size} unsaved row{dirtyIds.size === 1 ? '' : 's'}. Click Save to persist.
              </span>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog open={Boolean(toDelete)} title="Remove standings row?"
        message="The team will disappear from the public table immediately after the next save / on the next refresh."
        onCancel={() => setToDelete(null)} onConfirm={removeRow} />
    </div>
  );
}

// ─────────────────────── Shell ──────────────────────────

export default function StatsManager({ showToast, onDataChanged }) {
  const { categories } = useAppData();
  const [sub, setSub] = useState('standings');
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [competitions, setCompetitions] = useState([]);

  // Side-load the foreign-key lookups once so stat forms can render Selects
  // without each opening kicking off another request.
  useEffect(() => {
    Promise.all([
      api.admin.teams.list(), api.admin.players.list(),
      api.admin.seasons.list(), api.admin.competitions.list(),
    ]).then(([t, p, s, c]) => {
      const unwrap = (x) => Array.isArray(x) ? x : (x?.results || []);
      setTeams(unwrap(t)); setPlayers(unwrap(p));
      setSeasons(unwrap(s)); setCompetitions(unwrap(c));
    }).catch(() => { /* sub-tabs surface their own errors */ });
  }, []);

  const refreshLookups = async () => {
    const [t, p, s, c] = await Promise.all([
      api.admin.teams.list(), api.admin.players.list(),
      api.admin.seasons.list(), api.admin.competitions.list(),
    ]);
    const unwrap = (x) => Array.isArray(x) ? x : (x?.results || []);
    setTeams(unwrap(t)); setPlayers(unwrap(p));
    setSeasons(unwrap(s)); setCompetitions(unwrap(c));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap border-b border-white/10 pb-2">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.id;
          return (
            <button key={t.id} type="button" onClick={() => setSub(t.id)}
              className={`px-3 py-1.5 rounded-lg font-display text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition-all ${
                active
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === 'standings' && (
        <StandingsPanel teams={teams} seasons={seasons} competitions={competitions}
          showToast={showToast}
          onDataChanged={() => { refreshLookups(); onDataChanged?.(); }} />
      )}
      {sub === 'seasons' && (
        <SeasonsPanel showToast={showToast}
          onDataChanged={() => { refreshLookups(); onDataChanged?.(); }} />
      )}
      {sub === 'competitions' && (
        <CompetitionsPanel categories={categories} showToast={showToast}
          onDataChanged={() => { refreshLookups(); onDataChanged?.(); }} />
      )}
      {sub === 'team-stats' && (
        <TeamOrPlayerStatsPanel kind="team"
          teams={teams} players={players} seasons={seasons} competitions={competitions}
          showToast={showToast} onDataChanged={onDataChanged} />
      )}
      {sub === 'player-stats' && (
        <TeamOrPlayerStatsPanel kind="player"
          teams={teams} players={players} seasons={seasons} competitions={competitions}
          showToast={showToast} onDataChanged={onDataChanged} />
      )}
    </div>
  );
}
