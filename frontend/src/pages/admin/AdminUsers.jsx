import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ROLE_LABELS, formatDateTime } from '../../utils/constants';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminAPI.getUsers(filter ? { role: filter } : {}).then(({ data }) => {
      setUsers(data.data.users);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const updateStatus = async (id, accountStatus) => {
    await adminAPI.updateUser(id, { accountStatus });
    load();
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-medium">{u.fullName || u.phone}</p>
              <p className="text-sm text-gray-600">{ROLE_LABELS[u.role]} • {formatDateTime(u.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={u.accountStatus} />
              {u.accountStatus === 'ACTIVE' ? (
                <button onClick={() => updateStatus(u.id, 'SUSPENDED')} className="rounded border px-3 py-1 text-sm text-red-600">Suspend</button>
              ) : (
                <button onClick={() => updateStatus(u.id, 'ACTIVE')} className="rounded border px-3 py-1 text-sm text-green-600">Activate</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
