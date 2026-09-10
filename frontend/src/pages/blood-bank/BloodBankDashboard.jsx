import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDate } from '../../utils/constants';
import { Package, AlertTriangle, Calendar } from 'lucide-react';

export default function BloodBankDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bloodBankAPI.getDashboard().then(({ data: res }) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const { bloodBank, inventory, expiringUnits, appointments, camps } = data;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{bloodBank?.name}</h1>
        <StatusBadge status={bloodBank?.verificationStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold">Inventory Summary</h2>
            <Link to="/blood-bank/inventory" className="ml-auto text-sm text-primary-600">Manage →</Link>
          </div>
          {inventory?.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {inventory.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-center">
                  <p className="font-bold">{BLOOD_GROUP_LABELS[item.bloodGroup]}</p>
                  <p className="text-2xl font-semibold text-primary-600">{item.availableUnits}</p>
                  <p className="text-xs text-gray-500">available</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No inventory" action={<Link to="/blood-bank/inventory" className="text-primary-600">Add inventory</Link>} />
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold">Expiring Soon</h2>
          </div>
          {expiringUnits?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {expiringUnits.map((u) => (
                <li key={u.id}>{BLOOD_GROUP_LABELS[u.bloodGroup]} — {u.availableUnits} units by {formatDate(u.expiryDate)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No units expiring within 7 days</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent-600" />
          <h2 className="font-semibold">Upcoming Appointments</h2>
          <Link to="/blood-bank/appointments" className="ml-auto text-sm text-primary-600">Manage →</Link>
        </div>
        {appointments?.length ? (
          <ul className="mt-4 space-y-2">
            {appointments.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg border p-3">
                <span>{a.donorProfile?.user?.fullName}</span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No pending appointments</p>
        )}
      </div>
    </DashboardLayout>
  );
}
