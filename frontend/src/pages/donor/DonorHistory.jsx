import { useEffect, useState } from 'react';
import { donorAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDate } from '../../utils/constants';

export default function DonorHistory() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    donorAPI.getHistory().then(({ data }) => setDonations(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Donation History</h1>
      {donations.length ? (
        <div className="space-y-3">
          {donations.map((d) => (
            <div key={d.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{BLOOD_GROUP_LABELS[d.bloodGroup]}</span>
                <StatusBadge status={d.status} />
              </div>
              <p className="mt-1 text-sm text-gray-600">{d.bloodBank?.name}</p>
              <p className="text-sm text-gray-500">{formatDate(d.donationDate)}</p>
              {d.certificateRef && <p className="mt-1 text-xs text-gray-400">Ref: {d.certificateRef}</p>}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No donations recorded" description="Your donation history will appear here after you donate." />
      )}
    </DashboardLayout>
  );
}
