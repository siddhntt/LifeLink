import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { emergencyAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { Plus } from 'lucide-react';

export default function HospitalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    emergencyAPI.list().then(({ data }) => setRequests(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Emergency Requests</h1>
        <Link to="/hospital/requests/new" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          <Plus className="h-4 w-4" /> New Request
        </Link>
      </div>
      {requests.length ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <Link key={r.id} to={`/hospital/requests/${r.id}`} className="block rounded-xl bg-white p-4 shadow-sm hover:border-red-200 border border-transparent">
              <div className="flex justify-between">
                <span className="font-semibold">{BLOOD_GROUP_LABELS[r.bloodGroup]} × {r.requiredUnits}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Notified: {r.notifiedCount} • Accepted: {r.acceptedUnits}/{r.requiredUnits} • {formatDateTime(r.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No requests yet" description="Create an emergency request when blood is urgently needed." />
      )}
    </DashboardLayout>
  );
}
