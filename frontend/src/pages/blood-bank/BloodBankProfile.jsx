import { useEffect, useState } from 'react';
import { bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function BloodBankProfile() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    bloodBankAPI.getProfile().then(({ data }) => setForm(data.data)).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await bloodBankAPI.updateProfile(form);
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Blood Bank Profile</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {message && <p className="text-sm text-primary-600">{message}</p>}
        {['name', 'address', 'city', 'state', 'contactPhone', 'contactEmail'].map((f) => (
          <div key={f}>
            <label className="block text-sm font-medium capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input value={form[f] || ''} onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </div>
        ))}
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Save</button>
      </form>
    </DashboardLayout>
  );
}
