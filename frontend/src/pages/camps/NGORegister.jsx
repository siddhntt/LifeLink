import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function NGORegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', registrationNumber: '', address: '', city: '', state: '',
    contactPhone: '', contactEmail: '', representativeName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await campAPI.registerNGO(form);
      navigate('/camps/manage');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Register NGO / Camp Organizer</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {Object.keys(form).map((name) => (
          <div key={name}>
            <label className="block text-sm font-medium capitalize">{name.replace(/([A-Z])/g, ' $1')}</label>
            <input value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              required={name !== 'contactEmail' && name !== 'registrationNumber'}
              className="mt-1 w-full rounded-lg border px-3 py-2" />
          </div>
        ))}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary-600 py-2.5 text-white disabled:opacity-50">
          {loading ? 'Registering...' : 'Register Organization'}
        </button>
      </form>
    </DashboardLayout>
  );
}
