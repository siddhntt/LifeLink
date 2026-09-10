import { useEffect, useState } from 'react';
import { appointmentAPI, bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDate } from '../../utils/constants';

export default function DonorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [banks, setBanks] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ bloodBankId: '', slotId: '' });
  const [message, setMessage] = useState('');

  const load = () => {
    appointmentAPI.list().then(({ data }) => setAppointments(data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    bloodBankAPI.list().then(({ data }) => setBanks(data.data));
  }, []);

  const loadSlots = async (bankId) => {
    setForm({ bloodBankId: bankId, slotId: '' });
    if (!bankId) { setSlots([]); return; }
    const { data } = await bloodBankAPI.getSlots(bankId);
    setSlots(data.data.filter((s) => s.bookedCount < s.capacity));
  };

  const book = async (e) => {
    e.preventDefault();
    setBooking(true);
    setMessage('');
    try {
      await appointmentAPI.book({ slotId: form.slotId });
      setMessage('Appointment booked successfully');
      setForm({ bloodBankId: '', slotId: '' });
      setSlots([]);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Appointments</h1>

      <form onSubmit={book} className="mb-8 max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Book New Appointment</h2>
        {message && <p className="text-sm text-primary-600">{message}</p>}
        <div>
          <label className="block text-sm font-medium">Blood Bank</label>
          <select value={form.bloodBankId} onChange={(e) => loadSlots(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required>
            <option value="">Select blood bank</option>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Available Slot</label>
          <select value={form.slotId} onChange={(e) => setForm({ ...form, slotId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required disabled={!slots.length}>
            <option value="">Select slot</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {formatDate(s.date)} • {s.startTime}–{s.endTime} ({s.capacity - s.bookedCount} left)
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={booking || !form.slotId}
          className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
          {booking ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>

      <h2 className="mb-4 text-lg font-semibold">Your Appointments</h2>
      {appointments.length ? (
        <div className="space-y-3">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex justify-between">
                <span className="font-medium">{a.bloodBank?.name}</span>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm text-gray-600">{formatDate(a.slot?.date)} • {a.slot?.startTime}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No appointments" description="Book an appointment at a nearby blood bank." />
      )}
    </DashboardLayout>
  );
}
