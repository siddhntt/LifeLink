export default function StatusBadge({ status }) {
  const colors = {
    ELIGIBLE: 'bg-green-100 text-green-800',
    TEMPORARILY_UNAVAILABLE: 'bg-yellow-100 text-yellow-800',
    NEEDS_MEDICAL_REVIEW: 'bg-orange-100 text-orange-800',
    AVAILABLE: 'bg-green-100 text-green-800',
    NOT_AVAILABLE: 'bg-gray-100 text-gray-800',
    CREATED: 'bg-blue-100 text-blue-800',
    SEARCHING: 'bg-yellow-100 text-yellow-800 animate-pulse',
    PARTIALLY_FULFILLED: 'bg-orange-100 text-orange-800',
    FULFILLED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    EXPIRED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    VERIFIED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    NOTIFIED: 'bg-blue-100 text-blue-800',
    VIEWED: 'bg-indigo-100 text-indigo-800',
    ARRIVED: 'bg-teal-100 text-teal-800',
    DONATION_COMPLETED: 'bg-emerald-100 text-emerald-800',
    APPROVED: 'bg-green-100 text-green-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    NO_SHOW: 'bg-red-100 text-red-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    DEFERRED: 'bg-orange-100 text-orange-800',
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    DRAFT: 'bg-gray-100 text-gray-600',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    REGISTERED: 'bg-blue-100 text-blue-800',
    CHECKED_IN: 'bg-teal-100 text-teal-800',
    EMERGENCY: 'bg-red-100 text-red-800',
    URGENT: 'bg-orange-100 text-orange-800',
    NORMAL: 'bg-blue-100 text-blue-800',
  };

  const label = status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {label}
    </span>
  );
}
