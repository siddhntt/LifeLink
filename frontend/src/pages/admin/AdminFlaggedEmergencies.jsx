import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function AdminFlaggedEmergencies() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(null);

  const load = () => {
    adminAPI.getFlaggedEmergencies()
      .then(({ data }) => setRequests(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const clearFlag = async (id) => {
    if (!confirm('Clear this flag? The request will no longer appear in the flagged list.')) return;
    setClearing(id);
    try {
      await adminAPI.clearEmergencyFlag(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear flag');
    } finally {
      setClearing(null);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <ShieldAlert className="h-7 w-7 text-yellow-500" />
        <h1 className="text-2xl font-bold">Flagged Emergency Requests</h1>
        {requests.length > 0 && (
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            {requests.length} flagged
          </span>
        )}
      </div>

      <p className="mb-6 text-sm text-gray-500">
        These emergency requests were flagged because a similar request was created by the same hospital within the past hour. 
        Review each request and clear the flag if it is legitimate.
      </p>

      {requests.length ? (
        <div className="space-y-4">
          {requests.map((r) => {
            const responses = r.donorResponses || [];
            const accepted = responses.filter((d) => d.status === 'ACCEPTED').length;
            const total = responses.length;

            return (
              <div key={r.id} className="rounded-xl border border-yellow-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="text-lg font-semibold">
                        {BLOOD_GROUP_LABELS[r.bloodGroup]} × {r.requiredUnits} units
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {r.hospital?.name} — {r.hospital?.city}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>Created: {formatDateTime(r.createdAt)}</span>
                      <span>Notified: {r.notifiedCount} donors</span>
                      <span>Accepted: {accepted}/{total} responses</span>
                      <span>Radius: {r.currentRadiusKm} km</span>
                    </div>
                    {r.patientRef && (
                      <p className="mt-1 text-sm text-gray-500">Patient Ref: {r.patientRef}</p>
                    )}
                  </div>
                  <button
                    onClick={() => clearFlag(r.id)}
                    disabled={clearing === r.id}
                    className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {clearing === r.id ? 'Clearing...' : 'Clear Flag'}
                  </button>
                </div>
                <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  <span className="font-medium">Flag reason:</span> {r.flagReason}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No flagged requests"
          description="Suspicious or duplicate emergency requests will appear here for admin review."
        />
      )}
    </DashboardLayout>
  );
}
