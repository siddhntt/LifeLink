import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { donorAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { MapPin, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const GEO_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  CAPTURED: 'captured',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
};

export default function DonorProfile() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState(GEO_STATUS.IDLE);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const geoRequested = useRef(false);

  // Load existing profile
  useEffect(() => {
    donorAPI.getProfile().then(({ data }) => {
      const p = data.data;
      const profileData = {
        fullName: p.user?.fullName || '',
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        gender: p.gender || '',
        bloodGroup: p.bloodGroup || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        weight: p.weight || '',
        lastDonationDate: p.lastDonationDate ? p.lastDonationDate.split('T')[0] : '',
        latitude: p.latitude || null,
        longitude: p.longitude || null,
      };
      setForm(profileData);
      // If we already have location saved, mark as captured
      if (p.latitude && p.longitude) setGeoStatus(GEO_STATUS.CAPTURED);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-request location as soon as the page loads (after profile fetch)
  useEffect(() => {
    if (loading || geoRequested.current) return;
    if (!navigator.geolocation) { setGeoStatus(GEO_STATUS.UNAVAILABLE); return; }

    geoRequested.current = true;
    setGeoStatus(GEO_STATUS.REQUESTING);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setGeoStatus(GEO_STATUS.CAPTURED);
      },
      (err) => {
        if (err.code === 1) setGeoStatus(GEO_STATUS.DENIED);   // permission denied
        else setGeoStatus(GEO_STATUS.UNAVAILABLE);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [loading]); // runs once after loading=false

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const retryLocation = () => {
    if (!navigator.geolocation) return;
    setGeoStatus(GEO_STATUS.REQUESTING);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGeoStatus(GEO_STATUS.CAPTURED);
      },
      (err) => {
        if (err.code === 1) setGeoStatus(GEO_STATUS.DENIED);
        else setGeoStatus(GEO_STATUS.UNAVAILABLE);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Strip empty strings — Zod rejects empty string for numeric/date fields
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );
      if (payload.weight) payload.weight = parseFloat(payload.weight);
      await donorAPI.updateProfile(payload);
      await refreshUser();
      navigate('/donor/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const GeoIndicator = () => {
    if (geoStatus === GEO_STATUS.REQUESTING) return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
        <Loader className="h-4 w-4 animate-spin" />
        Requesting your location...
      </div>
    );
    if (geoStatus === GEO_STATUS.CAPTURED) return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        <CheckCircle className="h-4 w-4" />
        Location captured ({form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)})
      </div>
    );
    if (geoStatus === GEO_STATUS.DENIED) return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
          <AlertTriangle className="h-4 w-4" />
          Location permission denied — emergency matching may be less accurate.
        </div>
        <button type="button" onClick={retryLocation}
          className="text-xs text-blue-600 underline hover:text-blue-800">
          Try again
        </button>
      </div>
    );
    if (geoStatus === GEO_STATUS.UNAVAILABLE) return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
        <MapPin className="h-4 w-4" />
        Location unavailable on this device.
      </div>
    );
    return null;
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Complete Your Donor Profile</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <p className="text-sm text-gray-500">
          Complete your profile to enable emergency matching. Eligibility is assessed automatically.
        </p>

        {[
          { name: 'fullName', label: 'Full Name', type: 'text' },
          { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
          { name: 'weight', label: 'Weight (kg)', type: 'number' },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'city', label: 'City', type: 'text' },
          { name: 'state', label: 'State', type: 'text' },
          { name: 'lastDonationDate', label: 'Last Donation Date (if any)', type: 'date' },
        ].map(({ name, label, type }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input type={type} name={name} value={form[name] || ''} onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300" />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select name="gender" value={form.gender || ''} onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select</option>
            {['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'].map((g) => (
              <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Blood Group</label>
          <select name="bloodGroup" value={form.bloodGroup || ''} onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select</option>
            {Object.entries(BLOOD_GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Location — auto-captured, show status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Location <span className="text-xs text-gray-400">(used for nearby emergency matching)</span>
          </label>
          <GeoIndicator />
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </DashboardLayout>
  );
}
