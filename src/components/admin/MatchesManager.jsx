// EASD Admin — Matches + live events manager.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Flag, Radio, X, Download, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../../lib/api';
import {
  BulkActionBar, BulkCheckbox, Button, ConfirmDialog, EmptyState, Field, Modal, Select,
  Spinner, TextInput, Toggle, apiErrorMessage, bulkRemove, useBulkSelect, useFormState,
} from './shared';

const STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'LIVE', label: 'Live' },
  { value: 'HT', label: 'Half Time' },
  { value: 'FT', label: 'Full Time' },
  { value: 'POSTPONED', label: 'Postponed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EVENT_TYPES = [
  { value: 'GOAL', label: '⚽ Goal' },
  { value: 'YELLOW', label: '🟨 Yellow Card' },
  { value: 'RED', label: '🟥 Red Card' },
  { value: 'SUB', label: '🔄 Substitution' },
  { value: 'PEN', label: '⚽ Penalty' },
  { value: 'OG', label: '🥅 Own Goal' },
  { value: 'INFO', label: 'ℹ️ Info' },
];

const blank = {
  competition: 'EASD League',
  home_team: '',
  away_team: '',
  home_score: '',
  away_score: '',
  status: 'UPCOMING',
  minute: '',
  kickoff: '',
  kickoff_display: '',
  venue: '',
  order: 0,
  is_featured: false,
};

function MatchForm({ editing, teams, competitions, onSaved, onCancel, showToast }) {
  const [form, setField, setForm] = useFormState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editing?.id);

  useEffect(() => {
    if (!editing) {
      // Seed competition with the first admin-defined competition so the
      // dropdown starts on a real option instead of the legacy default.
      setForm({ ...blank, competition: competitions[0]?.name || '' });
      return;
    }
    // Match detail uses nested {home:{name,...}} — we need to find the team id from name.
    const homeTeam = teams.find((t) => t.name === editing.home?.name);
    const awayTeam = teams.find((t) => t.name === editing.away?.name);
    setForm({
      competition: editing.competition || '',
      home_team: homeTeam?.id || '',
      away_team: awayTeam?.id || '',
      home_score: editing.home?.score ?? '',
      away_score: editing.away?.score ?? '',
      status: editing.status || 'UPCOMING',
      minute: editing.minute || '',
      kickoff: '',
      kickoff_display: editing.kickoff || '',
      venue: editing.venue || '',
      order: editing.order ?? 0,
      is_featured: Boolean(editing.is_featured),
    });
  }, [editing, teams, competitions]);

  // The Match model stores `competition` as plain text, so the dropdown
  // emits the competition *name* (not id). If the saved value isn't one of
  // the admin-defined competitions (e.g. left over from an old import) we
  // still want it visible — surface it as a "legacy" option so editors can
  // re-pick a proper one without losing the current label.
  const competitionOpts = useMemo(() => {
    const opts = competitions.map((c) => ({
      value: c.name,
      label: c.category_name ? `${c.name} · ${c.category_name}` : c.name,
    }));
    if (form.competition && !competitions.some((c) => c.name === form.competition)) {
      opts.unshift({ value: form.competition, label: `${form.competition} (legacy)` });
    }
    if (!opts.length) {
      opts.unshift({ value: '', label: '— No competitions yet —' });
    }
    return opts;
  }, [competitions, form.competition]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.home_team || !form.away_team) {
      setError('Please pick both teams.'); return;
    }
    if (form.home_team === form.away_team) {
      setError('Home and away must be different teams.'); return;
    }
    setError(''); setSaving(true);
    const payload = {
      competition: form.competition,
      home_team: Number(form.home_team),
      away_team: Number(form.away_team),
      status: form.status,
      venue: form.venue,
      order: Number(form.order) || 0,
      is_featured: form.is_featured,
      home_score: form.home_score === '' ? null : Number(form.home_score),
      away_score: form.away_score === '' ? null : Number(form.away_score),
      minute: form.minute,
      kickoff_display: form.kickoff_display,
    };
    // Only send kickoff if user picked one; otherwise leave existing value untouched.
    if (form.kickoff) payload.kickoff = new Date(form.kickoff).toISOString();
    try {
      if (isEdit) {
        await api.admin.matches.update(editing.id, payload);
        showToast.showSuccess('Match updated');
      } else {
        await api.admin.matches.create(payload);
        showToast.showSuccess('Match created');
      }
      onSaved();
    } catch (e2) { setError(apiErrorMessage(e2, 'Save failed')); }
    finally { setSaving(false); }
  };

  const teamOpts = useMemo(
    () => [{ value: '', label: '— Select team —' }, ...teams.map((t) => ({ value: t.id, label: `${t.flag || t.short_name || '·'} ${t.name}` }))],
    [teams]
  );

  const isUpcoming = form.status === 'UPCOMING';
  const isInProgress = form.status === 'LIVE' || form.status === 'HT';
  const isFinished = form.status === 'FT';
  const isOff = form.status === 'POSTPONED' || form.status === 'CANCELLED';

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Competition" required hint={competitions.length ? undefined : 'Create a competition in the Stats tab first.'}>
        <Select value={form.competition} onChange={(v) => setField('competition', v)} options={competitionOpts} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Home team" required>
          <Select value={form.home_team} onChange={(v) => setField('home_team', v)} options={teamOpts} />
        </Field>
        <Field label="Away team" required>
          <Select value={form.away_team} onChange={(v) => setField('away_team', v)} options={teamOpts} />
        </Field>
      </div>

      <Field label="Status">
        <Select value={form.status} onChange={(v) => setField('status', v)} options={STATUS_OPTIONS} />
      </Field>

      {isUpcoming && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kickoff (local)" hint="Date & time — drives scheduling">
            <TextInput type="datetime-local" value={form.kickoff} onChange={(v) => setField('kickoff', v)} />
          </Field>
          <Field label="Kickoff label" hint="Optional display override, e.g. '15:00 EAT'">
            <TextInput value={form.kickoff_display} onChange={(v) => setField('kickoff_display', v)} placeholder="15:00 EAT" />
          </Field>
        </div>
      )}

      {isInProgress && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Home score" required>
              <TextInput type="number" value={form.home_score} onChange={(v) => setField('home_score', v)} min={0} />
            </Field>
            <Field label="Away score" required>
              <TextInput type="number" value={form.away_score} onChange={(v) => setField('away_score', v)} min={0} />
            </Field>
          </div>
          <Field label="Minute" hint="e.g. 67 or HT">
            <TextInput value={form.minute} onChange={(v) => setField('minute', v)} placeholder={form.status === 'HT' ? 'HT' : '67'} />
          </Field>
        </>
      )}

      {isFinished && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Final home score" required>
            <TextInput type="number" value={form.home_score} onChange={(v) => setField('home_score', v)} min={0} />
          </Field>
          <Field label="Final away score" required>
            <TextInput type="number" value={form.away_score} onChange={(v) => setField('away_score', v)} min={0} />
          </Field>
        </div>
      )}

      {isOff && (
        <div className="rounded-md bg-white/[0.03] border border-white/10 px-3 py-2 text-[12px] text-gray-400 font-body">
          Scores and minute hidden — match is {form.status.toLowerCase()}.
        </div>
      )}

      {!isOff && (
        <Field label="Venue">
          <TextInput value={form.venue} onChange={(v) => setField('venue', v)} placeholder="Nyayo Stadium, Nairobi" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Display order" hint="Lower = higher on page">
          <TextInput type="number" value={form.order} onChange={(v) => setField('order', v)} />
        </Field>
        <div className="flex items-end">
          <Toggle value={form.is_featured} onChange={(v) => setField('is_featured', v)} label="Featured" />
        </div>
      </div>

      {error && <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Create match'}</Button>
      </div>
    </form>
  );
}

function EventsPanel({ match, teams, onClose, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setField, setForm] = useFormState({
    event_type: 'GOAL', minute: '', player: '', team: '', detail: '',
  });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setEvents(await api.admin.matches.events(match.id)); }
    catch (e) { showToast.showError(apiErrorMessage(e, 'Load events failed')); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [match.id]);

  const addEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.matches.addEvent(match.id, {
        event_type: form.event_type,
        minute: Number(form.minute) || 0,
        player: form.player,
        team: form.team ? Number(form.team) : null,
        detail: form.detail,
      });
      setForm({ event_type: 'GOAL', minute: '', player: '', team: '', detail: '' });
      showToast.showSuccess('Event added');
      reload();
    } catch (e2) { showToast.showError(apiErrorMessage(e2, 'Add failed')); }
    finally { setSaving(false); }
  };

  const removeEvent = async (ev) => {
    try {
      await api.admin.matches.removeEvent(ev.id);
      showToast.showSuccess('Event removed');
      reload();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const teamOpts = useMemo(
    () => [{ value: '', label: '—' }, ...teams.map((t) => ({ value: t.id, label: `${t.flag || ''} ${t.short_name || t.name}`.trim() }))],
    [teams]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-[11px] uppercase tracking-wider text-gold/80">
          {match.home?.name} vs {match.away?.name}
        </div>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-[12px]">Back</button>
      </div>

      <form onSubmit={addEvent} className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-3">
          <Field label="Type">
            <Select value={form.event_type} onChange={(v) => setField('event_type', v)} options={EVENT_TYPES} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Minute">
            <TextInput type="number" value={form.minute} onChange={(v) => setField('minute', v)} />
          </Field>
        </div>
        <div className="col-span-4">
          <Field label="Player" required>
            <TextInput value={form.player} onChange={(v) => setField('player', v)} required />
          </Field>
        </div>
        <div className="col-span-3">
          <Field label="Team">
            <Select value={form.team} onChange={(v) => setField('team', v)} options={teamOpts} />
          </Field>
        </div>
        <div className="col-span-9">
          <Field label="Detail (optional)">
            <TextInput value={form.detail} onChange={(v) => setField('detail', v)} placeholder="assist by…" />
          </Field>
        </div>
        <div className="col-span-3">
          <Button type="submit" disabled={saving}><Plus size={12} /> Add event</Button>
        </div>
      </form>

      <div className="border-t border-white/10 pt-3">
        {loading ? <Spinner /> : !events.length ? (
          <EmptyState title="No events yet" hint="Add goals, cards, or substitutions above." />
        ) : (
          <ul className="space-y-1.5">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 text-sm font-body text-white">
                  <span className="font-mono text-[11px] text-gray-400 w-8 text-right">{ev.minute}'</span>
                  <span>{ev.icon}</span>
                  <span>{ev.player}</span>
                  {ev.detail && <span className="text-[12px] text-gray-500">· {ev.detail}</span>}
                </div>
                <button type="button" onClick={() => removeEvent(ev)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MatchesManager({ showToast, onDataChanged }) {
  const [rows, setRows] = useState([]);
  const [teams, setTeams] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [eventsFor, setEventsFor] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [ms, ts, cs] = await Promise.all([
        api.admin.matches.list(),
        api.admin.teams.list(),
        api.admin.competitions.list().catch(() => []),
      ]);
      setRows(Array.isArray(ms) ? ms : (ms?.results || []));
      setTeams(Array.isArray(ts) ? ts : (ts?.results || []));
      setCompetitions(Array.isArray(cs) ? cs : (cs?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load matches')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'visible') return rows.filter((r) => r.is_visible);
    if (filter === 'hidden') return rows.filter((r) => !r.is_visible);
    if (filter === 'live') return rows.filter((r) => r.status === 'LIVE' || r.status === 'HT');
    return rows;
  }, [rows, filter]);

  const bulk = useBulkSelect(filtered);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await api.admin.matches.remove(toDelete.id);
      showToast.showSuccess('Match deleted');
      setToDelete(null);
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Delete failed')); }
  };

  const runBulkDelete = async () => {
    const rowsToDelete = bulk.selectedRows;
    setBulkConfirm(false);
    const { ok, failed } = await bulkRemove(rowsToDelete, (r) => api.admin.matches.remove(r.id));
    if (failed.length) showToast.showError(`Deleted ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`Deleted ${ok} match${ok === 1 ? '' : 'es'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const bulkSetVisibility = async (visible) => {
    const targets = bulk.selectedRows;
    const { ok, failed } = await bulkRemove(targets, (r) => api.admin.matches.update(r.id, { is_visible: visible }));
    if (failed.length) showToast.showError(`Updated ${ok}, failed ${failed.length}.`);
    else showToast.showSuccess(`${visible ? 'Shown' : 'Hidden'} ${ok} match${ok === 1 ? '' : 'es'}.`);
    bulk.clear();
    await load();
    onDataChanged?.();
  };

  const toggleVisible = async (m) => {
    try {
      await api.admin.matches.update(m.id, { is_visible: !m.is_visible });
      await load();
      onDataChanged?.();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const r = await api.admin.matches.syncLive();
      showToast.showSuccess(`Synced ${r.fetched} · +${r.created} new · ${r.updated} updated · ${r.teams_created} teams created`);
      await load();
      onDataChanged?.();
    } catch (e) {
      showToast.showError(apiErrorMessage(e, 'Live sync failed — check API_FOOTBALL_KEY on the server.'));
    } finally { setSyncing(false); }
  };

  if (eventsFor) {
    return (
      <EventsPanel match={eventsFor} teams={teams} showToast={showToast}
        onClose={() => { setEventsFor(null); onDataChanged?.(); }} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[12px] text-gray-500 font-body">{rows.length} matches · {teams.length} teams</div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'visible', 'hidden', 'live'].map((f) => (
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
          {filtered.length > 0 && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 font-body cursor-pointer">
              <BulkCheckbox
                checked={bulk.allSelected}
                indeterminate={bulk.someSelected}
                onChange={bulk.toggleAll}
                ariaLabel="Select all matches"
              />
              Select all
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {syncing ? 'Syncing…' : 'Sync live fixtures'}
          </Button>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
            <Plus size={14} /> New match
          </Button>
        </div>
      </div>

      {bulk.count > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gold/30 bg-gold/[0.08] backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="font-display text-[11px] uppercase tracking-wider text-gold">
              {bulk.count} matches selected
            </span>
            <button type="button" onClick={bulk.clear}
              className="font-body text-[11px] text-gold/70 hover:text-gold underline underline-offset-2">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => bulkSetVisibility(true)}>
              <Eye size={12} /> Show on site
            </Button>
            <Button variant="ghost" size="sm" onClick={() => bulkSetVisibility(false)}>
              <EyeOff size={12} /> Hide
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkConfirm(true)}>
              <Trash2 size={12} /> Delete selected
            </Button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : !filtered.length ? (
        <EmptyState icon={<Flag size={28} />} title="No matches in this filter" hint="Add a match or sync live fixtures." />
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div key={m.id} className={`flex items-center justify-between gap-3 rounded-xl border bg-navy-100/40 px-3 py-2.5 transition-colors ${
              bulk.isSelected(m.id) ? 'border-gold/50 ring-1 ring-gold/30' : 'border-white/[0.06]'
            } ${m.is_visible ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <BulkCheckbox
                  checked={bulk.isSelected(m.id)}
                  onChange={() => bulk.toggle(m.id)}
                  ariaLabel={`Select ${m.home?.name} vs ${m.away?.name}`}
                />
                <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded border ${
                  m.status === 'LIVE' || m.status === 'HT'
                    ? 'bg-red-500/10 text-red-300 border-red-500/30 animate-pulse'
                    : m.status === 'FT'
                    ? 'bg-gray-500/10 text-gray-300 border-gray-500/20'
                    : 'bg-gold/10 text-gold border-gold/20'
                }`}>
                  {m.status === 'LIVE' ? 'Live' : m.status === 'HT' ? 'HT' : m.status === 'FT' ? 'FT' : m.kickoff || 'UPC'}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-gray-500 font-body flex items-center gap-1.5">
                    <span className="truncate">{m.competition}</span>
                    {m.external_source && m.external_source !== '' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title={`Auto-synced from ${m.external_source}`}>
                        <Download size={9} /> Synced
                      </span>
                    )}
                    {!m.is_visible && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        <EyeOff size={9} /> Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-white font-body truncate flex items-center gap-1.5">
                    {m.home?.logo
                      ? <img src={m.home.logo} alt="" className="w-4 h-4 rounded-sm object-cover inline-block" />
                      : <span>{m.home?.flag}</span>}
                    <span className="truncate">{m.home?.name}</span>
                    <span className="font-mono text-gold mx-1">{m.home?.score ?? '-'} – {m.away?.score ?? '-'}</span>
                    {m.away?.logo
                      ? <img src={m.away.logo} alt="" className="w-4 h-4 rounded-sm object-cover inline-block" />
                      : <span>{m.away?.flag}</span>}
                    <span className="truncate">{m.away?.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleVisible(m)}
                  title={m.is_visible ? 'Hide from public live strip' : 'Show on public live strip'}
                  className={`p-1.5 rounded transition-colors ${
                    m.is_visible
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-gray-500 hover:text-gold hover:bg-gold/10'
                  }`}>
                  {m.is_visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button type="button" onClick={() => setEventsFor(m)}
                  className="px-2 py-1 rounded text-[11px] font-display uppercase tracking-wider text-gray-300 hover:text-gold hover:bg-gold/10 flex items-center gap-1">
                  <Radio size={12} /> Events
                </button>
                <button type="button" onClick={() => { setEditing(m); setOpenForm(true); }} className="p-1.5 rounded text-gray-400 hover:text-gold hover:bg-gold/10"><Pencil size={13} /></button>
                <button type="button" onClick={() => setToDelete(m)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={openForm} onClose={() => setOpenForm(false)} title={editing ? 'Edit match' : 'New match'}>
        <MatchForm editing={editing} teams={teams} competitions={competitions} showToast={showToast}
          onCancel={() => setOpenForm(false)}
          onSaved={() => { setOpenForm(false); load(); onDataChanged?.(); }} />
      </Modal>
      <ConfirmDialog open={Boolean(toDelete)} title="Delete match?"
        message={`This will permanently remove ${toDelete?.home?.name} vs ${toDelete?.away?.name}.`}
        onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={bulkConfirm}
        title={`Delete ${bulk.count} match${bulk.count === 1 ? '' : 'es'}?`}
        message="This will permanently remove the selected matches and their events."
        confirmLabel={`Delete ${bulk.count}`}
        onCancel={() => setBulkConfirm(false)}
        onConfirm={runBulkDelete}
      />
    </div>
  );
}
