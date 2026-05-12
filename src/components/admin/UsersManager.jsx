// EASD Admin — User role management (admin only).

import { useEffect, useState } from 'react';
import { UserCog, ShieldCheck, ShieldOff } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Button, EmptyState, Select, Spinner, apiErrorMessage,
} from './shared';

const ROLE_OPTIONS = [
  { value: 'reader', label: 'Reader' },
  { value: 'author', label: 'Author' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_BADGE = {
  reader: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  author: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  editor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  admin: 'bg-gold/10 text-gold border-gold/30',
};

export default function UsersManager({ showToast, currentUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.admin.users.list();
      setRows(Array.isArray(res) ? res : (res?.results || []));
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Could not load users')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setBusy = (id, v) => setPending((p) => ({ ...p, [id]: v }));

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    setBusy(u.id, true);
    try {
      await api.admin.users.setRole(u.id, role);
      showToast.showSuccess(`Role updated to ${role}`);
      await load();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
    finally { setBusy(u.id, false); }
  };

  const toggleActive = async (u) => {
    setBusy(u.id, true);
    try {
      await api.admin.users.update(u.id, { is_active: !u.is_active });
      showToast.showSuccess(u.is_active ? 'User deactivated' : 'User reactivated');
      await load();
    } catch (e) { showToast.showError(apiErrorMessage(e, 'Update failed')); }
    finally { setBusy(u.id, false); }
  };

  if (loading) return <Spinner />;
  if (!rows.length) {
    return <EmptyState icon={<UserCog size={28} />} title="No users" hint="Users appear here as they register." />;
  }

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-gray-500 font-body">{rows.length} users</div>
      <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-navy-100/30">
        <table className="w-full text-sm font-body">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-gray-500 font-display">
            <tr>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2 hidden md:table-cell">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelf = currentUser && u.id === currentUser.id;
              return (
                <tr key={u.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <div className="text-white">{u.byline || u.display_name || u.username}</div>
                    <div className="text-[11px] text-gray-500">@{u.username}{isSelf && ' · you'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 hidden md:table-cell truncate max-w-[220px]">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded border ${ROLE_BADGE[u.role] || ROLE_BADGE.reader}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] ${u.is_active ? 'text-emerald' : 'text-red-400'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-32">
                        <Select value={u.role} onChange={(v) => changeRole(u, v)} options={ROLE_OPTIONS} />
                      </div>
                      <Button size="sm" variant={u.is_active ? 'danger' : 'subtle'}
                        disabled={isSelf || pending[u.id]} onClick={() => toggleActive(u)}>
                        {u.is_active ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                        {u.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
