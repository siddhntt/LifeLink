import { useState } from 'react';
import { bloodBankAPI } from '../services/endpoints';
import DashboardLayout from '../layouts/DashboardLayout';
import MapView from '../components/MapView';
import { BLOOD_GROUPS, BLOOD_GROUP_LABELS, formatDateTime } from '../utils/constants';

export default function BloodSearchPage() {
  const [form, setForm] = useState({ bloodGroup: 'O_POS', latitude: '', longitude: '', radiusKm: 50 });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((prev) => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
      () => alert('Could not get location. Please allow location access or use Raipur preset.')
    );
  };

  const setRaipur = () => setForm((prev) => ({ ...prev, latitude: 21.249, longitude: 81.631 }));

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const { data } = await bloodBankAPI.search({
        bloodGroup: form.bloodGroup,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radiusKm: parseFloat(form.radiusKm || 50),
      });
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const markers = results.map((r) => ({
    id: r.id,
    lat: r.latitude,
    lng: r.longitude,
    label: `${r.name} — ${r.availableUnits || 0} units`,
  }));

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Find Blood Availability</h1>

      <form onSubmit={search} className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-white p-6 shadow-sm">
        <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="rounded-lg border px-3 py-2">
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{BLOOD_GROUP_LABELS[g]}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="number" min="1" max="500" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })}
            className="w-24 rounded-lg border px-3 py-2" placeholder="Radius km" />
          <span className="text-xs text-gray-500">km</span>
        </div>
        <button type="button" onClick={getLocation} className="rounded-lg border px-4 py-2 text-sm">
          {form.latitude ? '📍 Location set' : 'Use My Location'}
        </button>
        <button type="button" onClick={setRaipur}
          className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100">
          Raipur Center
        </button>
        <button type="submit" disabled={loading || !form.latitude} className="rounded-lg bg-primary-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {form.latitude && markers.length > 0 && (
        <div className="mb-6">
          <MapView center={[parseFloat(form.latitude), parseFloat(form.longitude)]} markers={markers} radiusKm={form.radiusKm} />
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
          No blood banks with available <strong>{BLOOD_GROUP_LABELS[form.bloodGroup]}</strong> found within {form.radiusKm} km. Try expanding the radius.
        </div>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex justify-between">
              <h3 className="font-semibold">{r.name}</h3>
              <span className="font-bold text-primary-600">{r.availableUnits ?? 0} units</span>
            </div>
            <p className="text-sm text-gray-600">{r.city} • {r.distanceKm?.toFixed(1)} km away</p>
            <p className="text-sm text-gray-500">{r.contactPhone}</p>
            {r.inventoryUpdatedAt && (
              <p className="mt-1 text-xs text-gray-400">Last updated: {formatDateTime(r.inventoryUpdatedAt)}</p>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
