// EASD Component — BackendStatus
// Tiny floating dev badge showing whether the DRF API is reachable. Dismissible.

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

export default function BackendStatus() {
  const { loading, error } = useAppData();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) setShow(true);
  }, [loading]);

  useEffect(() => {
    if (show && !error) {
      const t = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(t);
    }
  }, [show, error]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] max-w-xs rounded-xl border backdrop-blur-xl shadow-xl shadow-black/40 font-body text-[12px] animate-fade-in"
      style={{
        background: error ? 'rgba(127,29,29,0.55)' : 'rgba(6,78,59,0.55)',
        borderColor: error ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.35)',
      }}>
      <div className="flex items-start gap-2 p-3">
        {error ? <AlertTriangle size={15} className="text-red-300 mt-0.5" />
               : <CheckCircle2 size={15} className="text-emerald-300 mt-0.5" />}
        <div className="flex-1">
          <div className="font-display text-[11px] uppercase tracking-wider mb-0.5 text-white">
            {error ? 'API offline' : 'Live data'}
          </div>
          <div className="text-gray-300 leading-snug">
            {error
              ? 'Could not reach DRF at http://127.0.0.1:8000. Start the backend.'
              : 'Connected to Django REST API · WebSocket scores live.'}
          </div>
        </div>
        <button type="button" onClick={() => setDismissed(true)}
          className="p-1 rounded text-gray-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
