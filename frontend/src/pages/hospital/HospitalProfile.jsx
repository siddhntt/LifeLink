import { useEffect, useState } from 'react';
import { hospitalAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function HospitalProfile() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    hospitalAPI.getProfile().then(({ data }) => setForm(data.data)).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await hospitalAPI.updateProfile(form);
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Hospital Profile</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {message && <p className="text-sm text-primary-600">{message}</p>}
        {['name', 'address', 'city', 'state', 'contactPhone', 'contactEmail', 'representativeName'].map((f) => (
          <div key={f}>
            <label className="block text-sm font-medium capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input name={f} value={form[f] || ''} onChange={handleChange} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </div>
        ))}
        <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-white disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </DashboardLayout>
  );
}
