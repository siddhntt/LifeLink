import { useEffect, useState } from 'react';
import { campAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/constants';

export default function CampManage() {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', date: '', startTime: '09:00', endTime: '17:00',
    address: '', city: '', state: '', capacity: 100, description: '', latitude: '', longitude: '',
  });
  const [message, setMessage] = useState('');

  const load = () => {
    campAPI.list().then(({ data }) => setCamps(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: pos.coords.latitude, longitude: pos.coords.longitude })
    );
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await campAPI.create({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        capacity: parseInt(form.capacity),
      });
      setMessage('Camp created — pending admin approval');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Manage Camps</h1>

      <form onSubmit={create} className="mb-8 max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Create Camp</h2>
        {message && <p className="text-sm text-primary-600">{message}</p>}
        {['name', 'address', 'city', 'state', 'description'].map((f) => (
          <div key={f}>
            <label className="block text-sm font-medium capitalize">{f}</label>
            {f === 'description' ? (
              <textarea value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} />
            ) : (
              <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} required={f !== 'description'} className="mt-1 w-full rounded-lg border px-3 py-2" />
            )}
          </div>
        ))}
        <div className="flex gap-4">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="rounded-lg border px-3 py-2" />
          <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded-lg border px-3 py-2" />
          <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="rounded-lg border px-3 py-2" />
          <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-24 rounded-lg border px-3 py-2" />
        </div>
        <button type="button" onClick={getLocation} className="rounded-lg border px-4 py-2 text-sm">Use Location</button>
        <button type="submit" disabled={!form.latitude} className="w-full rounded-lg bg-primary-600 py-2 text-white disabled:opacity-50">Create Camp</button>
      </form>

      <div className="space-y-3">
        {camps.map((c) => (
          <div key={c.id} className="flex justify-between rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-600">{formatDate(c.date)} • {c.city}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
