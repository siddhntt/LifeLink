import { useState } from 'react';
import { locationAPI } from '../services/endpoints';
import DashboardLayout from '../layouts/DashboardLayout';
import MapView from '../components/MapView';
import { formatDate } from '../utils/constants';

export default function NearbyMapPage() {
  const [coords, setCoords] = useState({ latitude: '', longitude: '', radiusKm: 25 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoords({ ...coords, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    });
  };

  const search = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: res } = await locationAPI.nearby({
        latitude: parseFloat(coords.latitude),
        longitude: parseFloat(coords.longitude),
        radiusKm: parseFloat(coords.radiusKm),
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const markers = data ? [
    ...data.bloodBanks.map((b) => ({ id: b.id, lat: b.latitude, lng: b.longitude, label: `[Bank] ${b.name}` })),
    ...data.hospitals.map((h) => ({ id: h.id, lat: h.latitude, lng: h.longitude, label: `[Hospital] ${h.name}` })),
    ...data.camps.map((c) => ({ id: c.id, lat: c.latitude, lng: c.longitude, label: `[Camp] ${c.name}` })),
  ] : [];

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Nearby Locations</h1>
      <form onSubmit={search} className="mb-6 flex flex-wrap gap-4 rounded-xl bg-white p-6 shadow-sm">
        <input type="number" value={coords.radiusKm} onChange={(e) => setCoords({ ...coords, radiusKm: e.target.value })}
          className="w-24 rounded-lg border px-3 py-2" placeholder="Radius" />
        <button type="button" onClick={getLocation} className="rounded-lg border px-4 py-2 text-sm">
          {coords.latitude ? 'Location set' : 'Use My Location'}
        </button>
        <button type="submit" disabled={loading || !coords.latitude} className="rounded-lg bg-primary-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? 'Loading...' : 'Search'}
        </button>
      </form>

      {coords.latitude && markers.length > 0 && (
        <div className="mb-6">
          <MapView center={[parseFloat(coords.latitude), parseFloat(coords.longitude)]} markers={markers} radiusKm={coords.radiusKm} />
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Blood Banks', data.bloodBanks],
            ['Hospitals', data.hospitals],
            ['Camps', data.camps],
          ].map(([title, items]) => (
            <div key={title} className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {items.length ? items.map((item) => (
                  <li key={item.id} className="rounded-lg border p-2">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-500">{item.city} • {item.distanceKm?.toFixed(1)} km</p>
                    {item.date && <p className="text-xs text-gray-400">{formatDate(item.date)}</p>}
                  </li>
                )) : <li className="text-gray-400">None within radius</li>}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
