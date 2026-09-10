import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS } from '../../utils/constants';

export default function CreateEmergencyRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bloodGroup: 'O_POS',
    requiredUnits: 1,
    urgency: 'EMERGENCY',
    requiredBy: '',
    patientRef: '',
    instructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Build payload — fix types that HTML inputs always return as strings
      const payload = {
        bloodGroup: form.bloodGroup,
        requiredUnits: parseInt(form.requiredUnits, 10),
        urgency: form.urgency,
        // datetime-local gives "2026-09-08T18:00" — Zod needs full ISO with timezone
        requiredBy: form.requiredBy ? new Date(form.requiredBy).toISOString() : undefined,
      };
      // Strip empty optional strings
      if (form.patientRef.trim()) payload.patientRef = form.patientRef.trim();
      if (form.instructions.trim()) payload.instructions = form.instructions.trim();

      const { data } = await emergencyAPI.create(payload);
      navigate(`/hospital/requests/${data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date(Date.now() + 3600000).toISOString().slice(0, 16);

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Create Emergency Request</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          LifeLink will immediately search for eligible, available donors nearby and notify them via push notification.
        </div>
        <div>
          <label className="block text-sm font-medium">Blood Group Required</label>
          <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="mt-1 w-full rounded-lg border px-3 py-2">
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{BLOOD_GROUP_LABELS[g]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Units Required</label>
          <input type="number" name="requiredUnits" min="1" max="20" value={form.requiredUnits} onChange={handleChange}
            className="mt-1 w-full rounded-lg border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Required By</label>
          <input type="datetime-local" name="requiredBy" value={form.requiredBy} onChange={handleChange} min={minDate}
            className="mt-1 w-full rounded-lg border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Patient Reference (internal)</label>
          <input name="patientRef" value={form.patientRef} onChange={handleChange} placeholder="Optional internal ref"
            className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Instructions for donors</label>
          <textarea name="instructions" value={form.instructions} onChange={handleChange} rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-red-600 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {loading ? 'Creating...' : 'Launch Emergency Search'}
        </button>
      </form>
    </DashboardLayout>
  );
}
