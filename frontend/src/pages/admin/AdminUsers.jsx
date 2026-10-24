import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TABS = [
  { key: 'DONOR', label: 'Donors' },
  { key: 'HOSPITAL', label: 'Hospitals' },
  { key: 'BLOOD_BANK', label: 'Blood Banks' },
  { key: 'CAMP_ORGANIZER', label: 'NGOs / Organizers' },
  { key: 'ADMIN', label: 'Admins' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('DONOR');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = (role) => {
    setLoading(true);
    adminAPI.getUsers({ role }).then(({ data }) => {
      setUsers(data.data.users);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(activeTab); }, [activeTab]);

  const updateStatus = async (id, accountStatus) => {
    await adminAPI.updateUser(id, { accountStatus });
    load(activeTab);
  };

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id));

  const DetailRow = ({ label, value }) => value != null && value !== '' ? (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{String(value)}</span>
    </div>
  ) : null;

  /* ── Role-specific detail renderers ── */

  const renderDonorDetails = (u) => {
    const d = u.donorProfile;
    if (!d) return <p className="mt-2 text-sm text-gray-400">Profile not completed</p>;
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-0.5">
        <DetailRow label="Blood Group" value={BLOOD_GROUP_LABELS[d.bloodGroup] || d.bloodGroup} />
        <DetailRow label="Gender" value={d.gender} />
        <DetailRow label="Date of Birth" value={d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : null} />
        <DetailRow label="Weight" value={d.weight ? `${d.weight} kg` : null} />
        <DetailRow label="Total Donations" value={d.totalDonations} />
        <DetailRow label="Last Donation" value={d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : 'Never'} />
        <DetailRow label="Eligibility" value={d.eligibilityStatus} />
        <DetailRow label="Availability" value={d.availability} />
        <DetailRow label="Email" value={u.email} />
        <DetailRow label="Phone" value={u.phone} />
        <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
      </div>
    );
  };

  const renderHospitalDetails = (u) => {
    const h = u.hospital;
    if (!h) return <p className="mt-2 text-sm text-gray-400">Hospital profile not registered</p>;
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-0.5">
        <DetailRow label="Hospital Name" value={h.name} />
        <DetailRow label="License Number" value={h.licenseNumber} />
        <DetailRow label="City" value={h.city} />
        <DetailRow label="Address" value={h.address} />
        <DetailRow label="Contact Phone" value={h.contactPhone} />
        <DetailRow label="Contact Email" value={h.contactEmail} />
        <DetailRow label="Verification" value={h.verificationStatus} />
        <DetailRow label="Account Email" value={u.email} />
        <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
      </div>
    );
  };

  const renderBloodBankDetails = (u) => {
    const b = u.bloodBank;
    if (!b) return <p className="mt-2 text-sm text-gray-400">Blood bank profile not registered</p>;
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-0.5">
        <DetailRow label="Blood Bank Name" value={b.name} />
        <DetailRow label="Registration No." value={b.registrationNumber} />
        <DetailRow label="City" value={b.city} />
        <DetailRow label="Address" value={b.address} />
        <DetailRow label="Contact Phone" value={b.contactPhone} />
        <DetailRow label="Contact Email" value={b.contactEmail} />
        <DetailRow label="Verification" value={b.verificationStatus} />
        <DetailRow label="Account Email" value={u.email} />
        <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
      </div>
    );
  };

  const renderNGODetails = (u) => {
    const n = u.ngo;
    if (!n) return <p className="mt-2 text-sm text-gray-400">NGO profile not registered</p>;
    return (
      <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-0.5">
        <DetailRow label="NGO Name" value={n.name} />
        <DetailRow label="Registration No." value={n.registrationNumber} />
        <DetailRow label="City" value={n.city} />
        <DetailRow label="Address" value={n.address} />
        <DetailRow label="Representative" value={n.representativeName} />
        <DetailRow label="Contact Phone" value={n.contactPhone} />
        <DetailRow label="Contact Email" value={n.contactEmail} />
        <DetailRow label="Verification" value={n.verificationStatus} />
        <DetailRow label="Account Email" value={u.email} />
        <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
      </div>
    );
  };

  const renderAdminDetails = (u) => (
    <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-0.5">
      <DetailRow label="Email" value={u.email} />
      <DetailRow label="Phone" value={u.phone} />
      <DetailRow label="Profile Complete" value={u.profileComplete ? 'Yes' : 'No'} />
      <DetailRow label="Last Login" value={u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'} />
    </div>
  );

  const renderDetails = (u) => {
    switch (activeTab) {
      case 'DONOR': return renderDonorDetails(u);
      case 'HOSPITAL': return renderHospitalDetails(u);
      case 'BLOOD_BANK': return renderBloodBankDetails(u);
      case 'CAMP_ORGANIZER': return renderNGODetails(u);
      case 'ADMIN': return renderAdminDetails(u);
      default: return null;
    }
  };

  /* ── Role-specific subtitle line for collapsed cards ── */

  const getSubtitle = (u) => {
    switch (activeTab) {
      case 'DONOR': {
        const d = u.donorProfile;
        return d ? `${BLOOD_GROUP_LABELS[d.bloodGroup] || '—'} • ${d.totalDonations || 0} donations` : 'Profile incomplete';
      }
      case 'HOSPITAL':
        return u.hospital ? `${u.hospital.name} • ${u.hospital.city}` : 'Not registered';
      case 'BLOOD_BANK':
        return u.bloodBank ? `${u.bloodBank.name} • ${u.bloodBank.city}` : 'Not registered';
      case 'CAMP_ORGANIZER':
        return u.ngo ? `${u.ngo.name} • ${u.ngo.city}` : 'Not registered';
      case 'ADMIN':
        return u.email || u.phone;
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-bold">User Management</h1>

      {/* Role Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setExpanded(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* User List */}
      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.fullName || u.phone || u.email || '—'}</p>
                  <p className="text-sm text-gray-600 truncate">{getSubtitle(u)} • Joined {formatDateTime(u.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.accountStatus} />
                  <button onClick={() => toggle(u.id)} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50" title="View details">
                    {expanded === u.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {u.role !== 'ADMIN' && (
                    u.accountStatus === 'ACTIVE' ? (
                      <button onClick={() => updateStatus(u.id, 'SUSPENDED')} className="rounded border px-3 py-1 text-sm text-red-600">Suspend</button>
                    ) : (
                      <button onClick={() => updateStatus(u.id, 'ACTIVE')} className="rounded border px-3 py-1 text-sm text-green-600">Activate</button>
                    )
                  )}
                </div>
              </div>
              {expanded === u.id && renderDetails(u)}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
