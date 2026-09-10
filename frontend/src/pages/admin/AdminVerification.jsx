import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminVerification() {
  const [items, setItems] = useState({ hospitals: [], bloodBanks: [], ngos: [], camps: [] });
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminAPI.getVerifications().then(({ data }) => setItems(data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const verify = async (type, id, status) => {
    const api = { hospital: adminAPI.verifyHospital, bloodBank: adminAPI.verifyBloodBank, ngo: adminAPI.verifyNGO }[type];
    await api(id, { status });
    load();
  };

  const approveCamp = async (id) => {
    await adminAPI.approveCamp(id);
    load();
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const Section = ({ title, list, type, fields }) => (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {list?.length ? (
        <ul className="mt-4 space-y-3">
          {list.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">{fields.map((f) => item[f]).filter(Boolean).join(' • ')}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={item.verificationStatus || item.status} />
                {(item.verificationStatus === 'PENDING' || item.status === 'PENDING_APPROVAL') && (
                  <>
                    <button onClick={() => type === 'camp' ? approveCamp(item.id) : verify(type, item.id, 'VERIFIED')}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white">Approve</button>
                    {type !== 'camp' && (
                      <button onClick={() => verify(type, item.id, 'REJECTED')}
                        className="rounded border px-3 py-1 text-sm text-red-600">Reject</button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No pending items</p>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Verification Queue</h1>
      <div className="space-y-6">
        <Section title="Hospitals" list={items.hospitals} type="hospital" fields={['city', 'contactPhone']} />
        <Section title="Blood Banks" list={items.bloodBanks} type="bloodBank" fields={['city', 'contactPhone']} />
        <Section title="NGOs" list={items.ngos} type="ngo" fields={['city', 'representativeName']} />
        <Section title="Camps Pending Approval" list={items.camps} type="camp" fields={['city', 'date']} />
      </div>
    </DashboardLayout>
  );
}
