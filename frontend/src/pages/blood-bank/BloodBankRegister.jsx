import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bloodBankAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import { CheckCircle, AlertTriangle, Loader, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GEO_STATUS = { IDLE: 'idle', REQUESTING: 'requesting', CAPTURED: 'captured', DENIED: 'denied', UNAVAILABLE: 'unavailable' };

export default function BloodBankRegister() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '', registrationNumber: '', address: '', city: '', state: '',
    contactPhone: '', contactEmail: '', latitude: null, longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geoStatus, setGeoStatus] = useState(GEO_STATUS.IDLE);
  const geoRequested = useRef(false);

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
      setError('Location is required. Please allow location access.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      );
      await bloodBankAPI.register(payload);
      await refreshUser();
      navigate('/blood-bank/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const GeoIndicator = () => {
    if (geoStatus === GEO_STATUS.REQUESTING) return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
        <Loader className="h-4 w-4 animate-spin" /> Requesting location...
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
          <AlertTriangle className="h-4 w-4" /> Location permission denied — required for blood search.
        </div>
        <button type="button" onClick={retryLocation} className="text-xs text-blue-600 underline">Try again</button>
      </div>
    );
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
        <MapPin className="h-4 w-4" /> Location unavailable.
      </div>
    );
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Register Blood Bank</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {[
          { name: 'name', label: 'Blood Bank Name', required: true },
          { name: 'registrationNumber', label: 'Registration Number', required: false },
          { name: 'address', label: 'Address', required: true },
          { name: 'city', label: 'City', required: true },
          { name: 'state', label: 'State', required: true },
          { name: 'contactPhone', label: 'Contact Phone', required: true },
          { name: 'contactEmail', label: 'Contact Email', required: false },
        ].map(({ name, label, required }) => (
          <div key={name}>
            <label className="block text-sm font-medium">{label}{required && <span className="text-red-500"> *</span>}</label>
            <input name={name} value={form[name]} onChange={handleChange} required={required}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300" />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">
            Location <span className="text-red-500">*</span>
            <span className="text-xs text-gray-400 font-normal ml-1">(for blood search proximity)</span>
          </label>
          <GeoIndicator />
        </div>

        <button type="submit" disabled={loading || !form.latitude}
          className="w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
          {loading ? 'Registering...' : 'Register Blood Bank'}
        </button>
      </form>
    </DashboardLayout>
  );
}
