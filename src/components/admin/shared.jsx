// EASD Admin — Shared form + layout primitives.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';

export function Field({ label, children, hint, required }) {
  return (
    <label className="block">
      <span className="block font-display text-[10px] uppercase tracking-[0.15em] text-gray-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-gray-600 mt-1 font-body">{hint}</span>}
    </label>
  );
}

export function TextInput({ value, onChange, type = 'text', placeholder, required, min, max }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
      className="w-full px-3 py-2 rounded-lg text-sm font-body text-white placeholder-gray-600 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
    />
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-lg text-sm font-body text-white placeholder-gray-600 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all resize-y"
    />
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg text-sm font-body text-white outline-none bg-navy-100 border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-display uppercase tracking-wider border transition-all ${
        value
          ? 'bg-emerald/10 border-emerald/30 text-emerald'
          : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
      }`}
    >
      <span className={`w-3 h-3 rounded-full transition-colors ${value ? 'bg-emerald' : 'bg-gray-600'}`} />
      {label}
    </button>
  );
}

export function Button({ children, onClick, variant = 'primary', type = 'button', disabled, size = 'md' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-display uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
  const sizes = { sm: 'text-[11px] px-3 py-1.5', md: 'text-[12px] px-4 py-2', lg: 'text-sm px-5 py-2.5' };
  const variants = {
    primary: 'bg-gradient-to-r from-gold to-yellow-500 text-navy hover:shadow-lg hover:shadow-gold/20',
    ghost: 'border border-white/10 text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/5',
    danger: 'border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500',
    subtle: 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.07] hover:text-white',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const { kind, message } = toast;
  const styles = kind === 'error'
    ? { bg: 'bg-red-900/60 border-red-500/40', icon: <AlertTriangle size={14} className="text-red-300" /> }
    : { bg: 'bg-emerald-900/60 border-emerald-500/40', icon: <Check size={14} className="text-emerald-300" /> };
  return (
    <div className={`fixed bottom-4 right-4 z-[200] max-w-sm rounded-xl border backdrop-blur-xl shadow-xl shadow-black/40 p-3 flex items-start gap-2 font-body text-[12px] text-white animate-fade-in ${styles.bg}`}>
      {styles.icon}
      <div className="flex-1">{message}</div>
      <button type="button" onClick={onClose} className="text-gray-300 hover:text-white">
        <X size={13} />
      </button>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-navy border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg text-white uppercase tracking-wider mb-2">{title}</h3>
        <p className="text-[13px] text-gray-400 font-body mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-white/10 rounded-xl">
      {icon && <div className="flex justify-center text-gold/60 mb-3">{icon}</div>}
      <div className="font-display text-sm uppercase tracking-wider text-gray-300">{title}</div>
      {hint && <p className="mt-1.5 text-[12px] text-gray-500 font-body">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gold/60" size={22} /></div>;
}

export function useFormState(initial) {
  const [state, setState] = useState(initial);
  const set = (field, value) => setState((s) => ({ ...s, [field]: value }));
  return [state, set, setState];
}

export function useToast() {
  const [toast, setToast] = useState(null);
  return {
    toast,
    showSuccess: (message) => setToast({ kind: 'success', message }),
    showError: (message) => setToast({ kind: 'error', message }),
    clearToast: () => setToast(null),
  };
}

/**
 * Multi-select state for admin tables. `rows` is the currently visible list,
 * `getId` extracts a stable id (defaults to `row.id`). Selections survive when
 * rows change, but are scoped to whatever id-set is currently in view.
 */
export function useBulkSelect(rows, getId = (r) => r.id) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const visibleIds = useMemo(() => new Set(rows.map(getId)), [rows, getId]);
  const selectedVisible = useMemo(
    () => [...selectedIds].filter((id) => visibleIds.has(id)),
    [selectedIds, visibleIds],
  );
  const allSelected = rows.length > 0 && selectedVisible.length === rows.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  const toggle = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (allSelected) rows.forEach((r) => next.delete(getId(r)));
    else rows.forEach((r) => next.add(getId(r)));
    return next;
  });
  const clear = () => setSelectedIds(new Set());
  const isSelected = (id) => selectedIds.has(id);
  const selectedRows = rows.filter((r) => selectedIds.has(getId(r)));

  return {
    selectedIds: selectedVisible,
    selectedRows,
    count: selectedVisible.length,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
    isSelected,
  };
}

export function BulkCheckbox({ checked, indeterminate, onChange, ariaLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate && !checked);
  }, [indeterminate, checked]);
  return (
    <label className="inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={ariaLabel}
        className="w-4 h-4 rounded bg-white/[0.06] border border-white/20 text-gold focus:ring-1 focus:ring-gold/40 accent-gold cursor-pointer"
      />
    </label>
  );
}

/**
 * Sticky action bar shown while one or more rows are selected.
 * `onDelete` receives the list of selected rows.
 */
export function BulkActionBar({ count, onClear, onDelete, label = 'items' }) {
  if (!count) return null;
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-gold/30 bg-gold/[0.08] backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="font-display text-[11px] uppercase tracking-wider text-gold">
          {count} {label}{count === 1 ? '' : ''} selected
        </span>
        <button
          type="button" onClick={onClear}
          className="font-body text-[11px] text-gold/70 hover:text-gold underline underline-offset-2"
        >
          Clear
        </button>
      </div>
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 size={12} /> Delete selected
      </Button>
    </div>
  );
}

/**
 * Runs `remove(item)` for each row sequentially (not parallel — keeps server
 * load sane and surfaces the first failing item cleanly). Returns a result
 * summary so callers can toast accurately.
 */
export async function bulkRemove(rows, remove) {
  let ok = 0;
  const failed = [];
  for (const row of rows) {
    try {
      await remove(row);
      ok += 1;
    } catch (e) {
      failed.push({ row, error: e });
    }
  }
  return { ok, failed };
}

export function apiErrorMessage(e, fallback = 'Request failed') {
  if (!e) return fallback;
  const d = e.data;
  if (typeof d === 'string' && d) return d;
  if (d && typeof d === 'object') {
    const firstKey = Object.keys(d)[0];
    if (firstKey) {
      const val = d[firstKey];
      const text = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : null);
      if (text) return firstKey === 'detail' ? text : `${firstKey}: ${text}`;
    }
  }
  return e.message || fallback;
}

/**
 * Chip-style freeform tag input with live suggestions from /api/stories/tags/.
 * `value` is an array of tag name strings; `onChange` receives the new array.
 */
export function TagInput({ value = [], onChange, placeholder = 'Add tag & press enter…', suggestMax = 8 }) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = text.trim().replace(/^#/, '');
    if (!q) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.tags.list(q);
        const list = Array.isArray(res) ? res : (res?.results || []);
        const taken = new Set(value.map((v) => v.toLowerCase()));
        setSuggestions(list.filter((t) => !taken.has((t.name || '').toLowerCase())).slice(0, suggestMax));
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(timer.current);
  }, [text, value, suggestMax]);

  const add = (name) => {
    const clean = (name || '').trim().replace(/^#/, '').trim();
    if (!clean) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) { setText(''); return; }
    onChange([...value, clean]);
    setText('');
    setSuggestions([]);
  };

  const remove = (name) => onChange(value.filter((v) => v !== name));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex flex-wrap gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 focus-within:border-gold/40 focus-within:ring-1 focus-within:ring-gold/20 transition-all">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-display uppercase tracking-wider bg-gold/10 text-gold border border-gold/30">
            #{v}
            <button type="button" onClick={() => remove(v)} className="opacity-60 hover:opacity-100">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : placeholder}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm font-body text-white placeholder-gray-600 py-1"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 left-0 right-0 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-navy-100 shadow-xl">
          {suggestions.map((s) => (
            <button
              key={s.id || s.slug}
              type="button"
              onClick={() => add(s.name)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left text-[12px] font-body text-gray-200 hover:bg-gold/10 hover:text-gold"
            >
              <span>#{s.name}</span>
              <span className="text-[10px] text-gray-500">{s.usage_count ?? 0} use{(s.usage_count ?? 0) === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className={`relative w-full ${widths[size]} my-8 bg-navy border border-white/10 rounded-2xl shadow-2xl shadow-black/60`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-navy/95 backdrop-blur-xl rounded-t-2xl">
          <h3 className="font-display text-base sm:text-lg text-white uppercase tracking-wider">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
