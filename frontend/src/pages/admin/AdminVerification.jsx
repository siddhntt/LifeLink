import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminVerification() {
  const [items, setItems] = useState({ hospitals: [], bloodBanks: [], ngos: [], camps: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // track which item is expanded

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

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const DetailRow = ({ label, value }) => value ? (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  ) : null;

  const Section = ({ title, list, type, detailFields }) => (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {list?.length ? (
        <ul className="mt-4 space-y-3">
          {list.map((item) => (
            <li key={item.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.city} • {item.contactPhone || item.representativeName || ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.verificationStatus || item.status} />
                  <button onClick={() => toggle(item.id)} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                    {expanded === item.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
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
              </div>
              {expanded === item.id && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
                  {detailFields.map(([label, key]) => (
                    <DetailRow key={key} label={label} value={item[key] || item.user?.[key]} />
                  ))}
                  {item.user?.phone && <DetailRow label="Registered Phone" value={item.user.phone} />}
                  {item.user?.email && <DetailRow label="Registered Email" value={item.user.email} />}
                  {item.user?.createdAt && <DetailRow label="Registration Date" value={new Date(item.user.createdAt).toLocaleDateString()} />}
                  {item.latitude && <DetailRow label="GPS Coordinates" value={`${item.latitude}, ${item.longitude}`} />}
                </div>
              )}
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
        <Section title="Hospitals" list={items.hospitals} type="hospital" detailFields={[
          ['Hospital Name', 'name'], ['License Number', 'licenseNumber'], ['City', 'city'], ['State', 'state'],
          ['Full Address', 'address'], ['Contact Phone', 'contactPhone'], ['Contact Email', 'contactEmail'],
          ['Emergency Phone', 'emergencyPhone'], ['Representative', 'representativeName'],
        ]} />
        <Section title="Blood Banks" list={items.bloodBanks} type="bloodBank" detailFields={[
          ['Blood Bank Name', 'name'], ['License Number', 'licenseNumber'], ['City', 'city'], ['State', 'state'],
          ['Full Address', 'address'], ['Contact Phone', 'contactPhone'], ['Operating Hours', 'operatingHours'],
          ['Has Component Separation', 'hasComponentSeparation'], ['Storage Capacity', 'storageCapacity'],
        ]} />
        <Section title="NGOs" list={items.ngos} type="ngo" detailFields={[
          ['NGO Name', 'name'], ['City', 'city'], ['State', 'state'], ['Address', 'address'],
          ['Representative', 'representativeName'], ['Contact Phone', 'contactPhone'],
        ]} />
        <Section title="Camps Pending Approval" list={items.camps} type="camp" detailFields={[
          ['Camp Name', 'name'], ['Date', 'date'], ['City', 'city'], ['Address', 'address'],
          ['Start Time', 'startTime'], ['End Time', 'endTime'], ['Capacity', 'capacity'],
        ]} />
      </div>
    </DashboardLayout>
  );
}
