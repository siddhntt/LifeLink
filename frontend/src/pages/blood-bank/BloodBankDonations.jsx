import { useState } from 'react';
import { bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS } from '../../utils/constants';

export default function BloodBankDonations() {
  const [form, setForm] = useState({ donorProfileId: '', bloodGroup: 'O_POS', certificateRef: '', notes: '' });
  const [message, setMessage] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      await bloodBankAPI.recordDonation(form);
      setMessage('Donation recorded successfully');
      setForm({ donorProfileId: '', bloodGroup: 'O_POS', certificateRef: '', notes: '' });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to record donation');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Record Donation</h1>
      <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {message && <p className="text-sm text-primary-600">{message}</p>}
        <div>
          <label className="block text-sm font-medium">Donor Profile ID</label>
          <input value={form.donorProfileId} onChange={(e) => setForm({ ...form, donorProfileId: e.target.value })}
            required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="UUID from appointment/emergency" />
        </div>
        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="w-full rounded-lg border px-3 py-2">
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{BLOOD_GROUP_LABELS[g]}</option>)}
        </select>
        <input value={form.certificateRef} onChange={(e) => setForm({ ...form, certificateRef: e.target.value })}
          placeholder="Certificate reference" className="w-full rounded-lg border px-3 py-2" />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes" className="w-full rounded-lg border px-3 py-2" rows={2} />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Record Donation</button>
      </form>
    </DashboardLayout>
  );
}
