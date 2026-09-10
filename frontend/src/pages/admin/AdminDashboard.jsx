import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ROLE_LABELS } from '../../utils/constants';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAPI.getDashboard()
      .then(({ data: res }) => setData(res.data))
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (error) return <DashboardLayout><p className="text-red-500">{error}</p></DashboardLayout>;
  if (!data) return <DashboardLayout><p>No data available.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <p className="mb-4 text-sm text-gray-500">{data.demoNote}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-6 shadow-sm text-center">
          <p className="text-3xl font-bold text-primary-600">{data.activeEmergencies}</p>
          <p className="text-sm text-gray-600">Active Emergencies</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm text-center">
          <p className="text-3xl font-bold text-yellow-600">{data.pendingVerifications}</p>
          <p className="text-sm text-gray-600">Pending Verifications</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm text-center">
          <p className="text-3xl font-bold text-green-600">{data.fulfillmentRate}%</p>
          <p className="text-sm text-gray-600">Fulfillment Rate</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm text-center">
          <p className="text-3xl font-bold">{data.donorStats?._count || 0}</p>
          <p className="text-sm text-gray-600">Total Donors</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Users by Role</h2>
          <ul className="mt-4 space-y-2">
            {data.userCounts?.map((u) => (
              <li key={u.role} className="flex justify-between text-sm">
                <span>{ROLE_LABELS[u.role] || u.role}</span>
                <span className="font-medium">{u._count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Recent Emergencies</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {data.recentEmergencies?.map((e) => (
              <li key={e.id} className="flex justify-between">
                <span>{e.hospital?.name}</span>
                <span className="text-gray-500">{e.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
