import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { hospitalAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import { MapPin, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GEO_STATUS = { IDLE: 'idle', REQUESTING: 'requesting', CAPTURED: 'captured', DENIED: 'denied', UNAVAILABLE: 'unavailable' };

export default function HospitalRegister() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '', registrationNumber: '', licenseNumber: '', address: '', city: '', state: '',
    contactPhone: '', contactEmail: '', representativeName: '', latitude: null, longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState(GEO_STATUS.IDLE);
  const geoRequested = useRef(false);

  // Auto-request location on mount
  useEffect(() => {
    if (geoRequested.current || !navigator.geolocation) {
      if (!navigator.geolocation) setGeoStatus(GEO_STATUS.UNAVAILABLE);
      return;
    }
    geoRequested.current = true;
    setGeoStatus(GEO_STATUS.REQUESTING);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGeoStatus(GEO_STATUS.CAPTURED);
      },
      (err) => setGeoStatus(err.code === 1 ? GEO_STATUS.DENIED : GEO_STATUS.UNAVAILABLE),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const retryLocation = () => {
    setGeoStatus(GEO_STATUS.REQUESTING);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGeoStatus(GEO_STATUS.CAPTURED);
      },
      (err) => setGeoStatus(err.code === 1 ? GEO_STATUS.DENIED : GEO_STATUS.UNAVAILABLE),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      setError('Hospital location is required for emergency matching. Please allow location access.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Strip empty optional fields — Zod rejects empty strings for optional fields
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );
      await hospitalAPI.register(payload);
      await refreshUser();
      navigate('/hospital/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const GeoIndicator = () => {
    if (geoStatus === GEO_STATUS.REQUESTING) return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
        <Loader className="h-4 w-4 animate-spin" /> Requesting hospital location...
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
          Location permission denied — required for emergency matching.
        </div>
        <button type="button" onClick={retryLocation} className="text-xs text-blue-600 underline">Try again</button>
      </div>
    );
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
        <MapPin className="h-4 w-4" /> Location unavailable on this device.
      </div>
    );
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Register Hospital</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <p className="text-sm text-gray-500">Your hospital must be verified by an admin before creating emergency requests.</p>

        {[
          { name: 'name', label: 'Hospital Name', required: true },
          { name: 'registrationNumber', label: 'Registration Number', required: false },
          { name: 'licenseNumber', label: 'License Number', required: false },
          { name: 'address', label: 'Address', required: true },
          { name: 'city', label: 'City', required: true },
          { name: 'state', label: 'State', required: true },
          { name: 'contactPhone', label: 'Contact Phone', required: true },
          { name: 'contactEmail', label: 'Contact Email', required: false },
          { name: 'representativeName', label: 'Authorized Representative', required: true },
        ].map(({ name, label, required }) => (
          <div key={name}>
            <label className="block text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}</label>
            <input name={name} value={form[name]} onChange={handleChange} required={required}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300" />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">
            Hospital Location <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 font-normal ml-1">(used for donor proximity matching)</span>
          </label>
          <GeoIndicator />
        </div>

        <button type="submit" disabled={loading || !form.latitude}
          className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
          {loading ? 'Registering...' : 'Register Hospital'}
        </button>
      </form>
    </DashboardLayout>
  );
}
