import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapView({ center = [20.5937, 78.9629], zoom = 12, markers = [], radiusKm }) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-64 w-full rounded-lg sm:h-80">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {radiusKm && (
        <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#dc2626', fillOpacity: 0.1 }} />
      )}
      {markers.map((m) => (
        <Marker key={m.id || `${m.lat}-${m.lng}`} position={[m.lat, m.lng]}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
