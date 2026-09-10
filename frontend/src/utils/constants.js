export const BLOOD_GROUP_LABELS = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
};

export const BLOOD_GROUPS = Object.keys(BLOOD_GROUP_LABELS);

export const STATUS_COLORS = {
  ELIGIBLE: 'bg-green-100 text-green-800',
  TEMPORARILY_UNAVAILABLE: 'bg-yellow-100 text-yellow-800',
  NEEDS_MEDICAL_REVIEW: 'bg-orange-100 text-orange-800',
  AVAILABLE: 'bg-green-100 text-green-800',
  NOT_AVAILABLE: 'bg-gray-100 text-gray-800',
  CREATED: 'bg-blue-100 text-blue-800',
  SEARCHING: 'bg-yellow-100 text-yellow-800',
  PARTIALLY_FULFILLED: 'bg-orange-100 text-orange-800',
  FULFILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  EXPIRED: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  VERIFIED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  NOTIFIED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
};

export const ROLE_LABELS = {
  DONOR: 'Donor',
  HOSPITAL: 'Hospital',
  BLOOD_BANK: 'Blood Bank',
  CAMP_ORGANIZER: 'Camp Organizer',
  ADMIN: 'Administrator',
};

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
