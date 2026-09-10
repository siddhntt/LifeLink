import { useEffect, useState } from 'react';
import { bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS, formatDate } from '../../utils/constants';

export default function BloodBankInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ bloodGroup: 'O_POS', availableUnits: 1, expiryDate: '', collectionDate: '' });
  const [message, setMessage] = useState('');

  const load = () => {
    bloodBankAPI.getDashboard().then(({ data }) => {
      setInventory(data.data.inventory || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await bloodBankAPI.addInventory(form);
      setMessage('Inventory added');
      setForm({ bloodGroup: 'O_POS', availableUnits: 1, expiryDate: '', collectionDate: '' });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const updateUnits = async (id, action, units = 1) => {
    await bloodBankAPI.updateInventory(id, { action, units });
    load();
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Blood Inventory</h1>

      <form onSubmit={add} className="mb-8 flex flex-wrap gap-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="w-full font-semibold">Add Inventory</h2>
        {message && <p className="w-full text-sm text-primary-600">{message}</p>}
        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="rounded-lg border px-3 py-2">
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{BLOOD_GROUP_LABELS[g]}</option>)}
        </select>
        <input type="number" min="1" value={form.availableUnits} onChange={(e) => setForm({ ...form, availableUnits: +e.target.value })}
          className="w-24 rounded-lg border px-3 py-2" placeholder="Units" />
        <input type="date" value={form.collectionDate} onChange={(e) => setForm({ ...form, collectionDate: e.target.value })} className="rounded-lg border px-3 py-2" />
        <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="rounded-lg border px-3 py-2" />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Add</button>
      </form>

      <div className="space-y-3">
        {inventory.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <span className="text-lg font-bold">{BLOOD_GROUP_LABELS[item.bloodGroup]}</span>
              <StatusBadge status={item.status} />
              <p className="text-sm text-gray-600">{item.availableUnits} available • {item.reservedUnits} reserved</p>
              {item.expiryDate && <p className="text-xs text-gray-400">Expires: {formatDate(item.expiryDate)}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateUnits(item.id, 'reserve')} className="rounded border px-3 py-1 text-sm">Reserve</button>
              <button onClick={() => updateUnits(item.id, 'release')} className="rounded border px-3 py-1 text-sm">Release</button>
              <button onClick={() => updateUnits(item.id, 'mark_expired')} className="rounded border px-3 py-1 text-sm text-red-600">Mark Expired</button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
