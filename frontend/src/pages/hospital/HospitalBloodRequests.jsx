import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bloodRequestAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { Plus } from 'lucide-react';

export default function HospitalBloodRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bloodGroup: 'O_POS', requiredUnits: 1, urgency: 'NORMAL', requiredBy: '', instructions: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () => bloodRequestAPI.list().then(({ data }) => setRequests(data.data)).finally(() => setLoading(false));

  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    await bloodRequestAPI.create(form);
    setShowForm(false);
    load();
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">Blood Requests</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white">
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-6 space-y-3 rounded-xl bg-white p-6 shadow-sm">
          <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="rounded-lg border px-3 py-2">
            {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" min="1" value={form.requiredUnits} onChange={(e) => setForm({ ...form, requiredUnits: +e.target.value })} className="w-24 rounded-lg border px-3 py-2" />
          <input type="datetime-local" value={form.requiredBy} onChange={(e) => setForm({ ...form, requiredBy: e.target.value })} required className="rounded-lg border px-3 py-2" />
          <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Instructions" className="w-full rounded-lg border px-3 py-2" rows={2} />
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Submit</button>
        </form>
      )}

      {requests.length ? requests.map((r) => (
        <div key={r.id} className="mb-3 flex justify-between rounded-xl bg-white p-4 shadow-sm">
          <div>
            <span className="font-semibold">{BLOOD_GROUP_LABELS[r.bloodGroup]} × {r.requiredUnits}</span>
            <p className="text-sm text-gray-600">{formatDateTime(r.createdAt)}</p>
          </div>
          <StatusBadge status={r.status} />
        </div>
      )) : (
        <EmptyState title="No blood requests" description="Create a normal blood request for non-emergency needs." />
      )}
    </DashboardLayout>
  );
}
