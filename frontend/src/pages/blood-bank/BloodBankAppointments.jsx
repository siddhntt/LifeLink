import { useEffect, useState } from 'react';
import { appointmentAPI, bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/constants';

export default function BloodBankAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '09:00', endTime: '10:00', capacity: 5 });
  const [loading, setLoading] = useState(true);

  const load = () => {
    bloodBankAPI.getDashboard().then(({ data }) => {
      setAppointments(data.data.appointments || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id, status) => {
    await appointmentAPI.update(id, { status });
    load();
  };

  const createSlot = async (e) => {
    e.preventDefault();
    await bloodBankAPI.createSlot(slotForm);
    setSlotForm({ date: '', startTime: '09:00', endTime: '10:00', capacity: 5 });
    load();
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Appointments</h1>

      <form onSubmit={createSlot} className="mb-8 flex flex-wrap gap-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="w-full font-semibold">Create Appointment Slot</h2>
        <input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} required className="rounded-lg border px-3 py-2" />
        <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} className="rounded-lg border px-3 py-2" />
        <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} className="rounded-lg border px-3 py-2" />
        <input type="number" min="1" value={slotForm.capacity} onChange={(e) => setSlotForm({ ...slotForm, capacity: +e.target.value })} className="w-20 rounded-lg border px-3 py-2" />
        <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-white">Create Slot</button>
      </form>

      <div className="space-y-3">
        {appointments.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm">
            <div>
              <p className="font-medium">{a.donorProfile?.user?.fullName}</p>
              <p className="text-sm text-gray-600">{formatDate(a.slot?.date)} • {a.slot?.startTime}</p>
              <p className="text-sm text-gray-500">{a.donorProfile?.user?.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} />
              {a.status === 'PENDING' && (
                <>
                  <button onClick={() => updateStatus(a.id, 'CONFIRMED')} className="rounded bg-green-600 px-3 py-1 text-sm text-white">Confirm</button>
                  <button onClick={() => updateStatus(a.id, 'REJECTED')} className="rounded border px-3 py-1 text-sm">Reject</button>
                </>
              )}
              {a.status === 'CONFIRMED' && (
                <button onClick={() => updateStatus(a.id, 'COMPLETED')} className="rounded bg-primary-600 px-3 py-1 text-sm text-white">Complete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
