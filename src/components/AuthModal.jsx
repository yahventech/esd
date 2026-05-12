// EASD Component — AuthModal
// Unified login/register modal controlled by the AuthContext.

import { useEffect, useState } from 'react';
import { X, LogIn, UserPlus, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { authOpen, setAuthOpen, authTab, setAuthTab, login, register } = useAuth();
  const [form, setForm] = useState({
    username: '', email: '', password: '', display_name: '', favorite_sport: '',
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authOpen) {
      setErr(''); setSuccess(false); setLoading(false);
      setForm({ username: '', email: '', password: '', display_name: '', favorite_sport: '' });
    }
  }, [authOpen]);

  if (!authOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (authTab === 'login') {
        await login(form.username || form.email, form.password);
      } else {
        await register({
          username: form.username,
          email: form.email,
          password: form.password,
          display_name: form.display_name,
          favorite_sport: form.favorite_sport,
        });
      }
      setSuccess(true);
      setTimeout(() => setAuthOpen(false), 600);
    } catch (e2) {
      const d = e2.data;
      const msg =
        (d && typeof d === 'object' && (d.detail || Object.values(d).flat()[0])) ||
        e2.message ||
        'Something went wrong';
      setErr(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => setAuthOpen(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-navy border border-white/10 shadow-2xl shadow-black/60 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setAuthOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>

        <h2 className="font-display text-2xl font-bold uppercase tracking-wider mb-1">
          <span className="bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">
            {authTab === 'login' ? 'Welcome back' : 'Join EASD'}
          </span>
        </h2>
        <p className="text-[13px] text-gray-500 font-body mb-5">
          {authTab === 'login'
            ? 'Sign in to comment, bookmark stories, and personalize your feed.'
            : 'Create an account to join the community covering East African sport.'}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 rounded-lg bg-white/[0.04] border border-white/10">
          {['login', 'register'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAuthTab(t)}
              className={`flex-1 py-2 rounded-md font-display text-[12px] uppercase tracking-wider transition-all ${
                authTab === t
                  ? 'bg-gradient-to-r from-gold to-yellow-500 text-navy shadow-lg shadow-gold/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {authTab === 'register' && (
            <Input label="Display name" value={form.display_name}
              onChange={(v) => setForm((f) => ({ ...f, display_name: v }))} required />
          )}

          <Input
            label={authTab === 'login' ? 'Username or email' : 'Username'}
            value={form.username}
            onChange={(v) => setForm((f) => ({ ...f, username: v }))}
            required
            autoComplete="username"
          />

          {authTab === 'register' && (
            <Input label="Email" type="email" value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
          )}

          <Input
            label="Password" type="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            required minLength={6}
            autoComplete={authTab === 'login' ? 'current-password' : 'new-password'}
          />

          {authTab === 'register' && (
            <Input label="Favorite sport (optional)" value={form.favorite_sport}
              onChange={(v) => setForm((f) => ({ ...f, favorite_sport: v }))} />
          )}

          {err && (
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-gold to-yellow-500 text-navy hover:shadow-lg hover:shadow-gold/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" />
              : success ? <><Check size={16} /> Welcome!</>
              : authTab === 'login'
                ? <><LogIn size={16} /> Sign in</>
                : <><UserPlus size={16} /> Create account</>}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required, minLength, autoComplete }) {
  return (
    <label className="block">
      <span className="block font-display text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full px-3.5 py-2.5 rounded-lg text-sm font-body text-white placeholder-gray-500 outline-none bg-white/[0.04] border border-white/10 focus:border-gold/40 focus:ring-1 focus:ring-gold/20 transition-all"
      />
    </label>
  );
}
