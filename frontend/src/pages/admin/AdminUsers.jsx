import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ROLE_LABELS, BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    adminAPI.getUsers(filter ? { role: filter } : {}).then(({ data }) => {
      setUsers(data.data.users);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const updateStatus = async (id, accountStatus) => {
    await adminAPI.updateUser(id, { accountStatus });
    load();
  };

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const DetailRow = ({ label, value }) => value != null && value !== '' ? (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{String(value)}</span>
    </div>
  ) : null;

  const renderProfile = (u) => {
    if (u.donorProfile) {
      const d = u.donorProfile;
      return (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
          <DetailRow label="Blood Group" value={BLOOD_GROUP_LABELS[d.bloodGroup] || d.bloodGroup} />
          <DetailRow label="Gender" value={d.gender} />
          <DetailRow label="Date of Birth" value={d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null} />
          <DetailRow label="Weight" value={d.weight ? `${d.weight} kg` : null} />
          <DetailRow label="Total Donations" value={d.totalDonations} />
          <DetailRow label="Last Donation" value={d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : 'Never'} />
          <DetailRow label="Eligibility" value={d.eligibilityStatus} />
          <DetailRow label="Availability" value={d.availabilityStatus} />
          <DetailRow label="Email" value={u.email} />
          <DetailRow label="Phone" value={u.phone} />
          <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
        </div>
      );
    }
    if (u.hospital) {
      const h = u.hospital;
      return (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
          <DetailRow label="Hospital Name" value={h.name} />
          <DetailRow label="License Number" value={h.licenseNumber} />
          <DetailRow label="City" value={h.city} />
          <DetailRow label="Address" value={h.address} />
          <DetailRow label="Contact Phone" value={h.contactPhone} />
          <DetailRow label="Contact Email" value={h.contactEmail} />
          <DetailRow label="Verification" value={h.verificationStatus} />
          <DetailRow label="Email" value={u.email} />
          <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
        </div>
      );
    }
    if (u.bloodBank) {
      const b = u.bloodBank;
      return (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
          <DetailRow label="Blood Bank Name" value={b.name} />
          <DetailRow label="License Number" value={b.licenseNumber} />
          <DetailRow label="City" value={b.city} />
          <DetailRow label="Address" value={b.address} />
          <DetailRow label="Contact Phone" value={b.contactPhone} />
          <DetailRow label="Operating Hours" value={b.operatingHours} />
          <DetailRow label="Verification" value={b.verificationStatus} />
          <DetailRow label="Email" value={u.email} />
          <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
        </div>
      );
    }
    if (u.ngo) {
      const n = u.ngo;
      return (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
          <DetailRow label="NGO Name" value={n.name} />
          <DetailRow label="City" value={n.city} />
          <DetailRow label="Representative" value={n.representativeName} />
          <DetailRow label="Verification" value={n.verificationStatus} />
          <DetailRow label="Email" value={u.email} />
          <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
        </div>
      );
    }
    // Admin or no profile
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 border-t divide-y divide-gray-200">
        <DetailRow label="Email" value={u.email} />
        <DetailRow label="Phone" value={u.phone} />
        <DetailRow label="Profile Complete" value={u.profileComplete ? 'Yes' : 'No'} />
        <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border px-3 py-2">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{u.fullName || u.phone}</p>
                <p className="text-sm text-gray-600">{ROLE_LABELS[u.role]} • {formatDateTime(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={u.accountStatus} />
                <button onClick={() => toggle(u.id)} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50" title="View details">
                  {expanded === u.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {u.accountStatus === 'ACTIVE' ? (
                  <button onClick={() => updateStatus(u.id, 'SUSPENDED')} className="rounded border px-3 py-1 text-sm text-red-600">Suspend</button>
                ) : (
                  <button onClick={() => updateStatus(u.id, 'ACTIVE')} className="rounded border px-3 py-1 text-sm text-green-600">Activate</button>
                )}
              </div>
            </div>
            {expanded === u.id && renderProfile(u)}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
