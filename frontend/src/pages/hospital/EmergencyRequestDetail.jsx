import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { emergencyAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { Radio, MapPin, Clock, Users, Target, CheckCircle2, Phone, UserCheck, Droplets, Navigation } from 'lucide-react';

// Fix leaflet default marker icons (Vite asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HOSPITAL_ICON = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="40" height="50">
      <circle cx="20" cy="20" r="18" fill="#ef4444" stroke="white" stroke-width="3"/>
      <text x="20" y="26" text-anchor="middle" font-size="18" fill="white">🏥</text>
      <polygon points="20,48 10,34 30,34" fill="#ef4444"/>
    </svg>
  `),
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -50],
});

const DONOR_ICON = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" width="40" height="50">
      <circle cx="20" cy="20" r="18" fill="#2563eb" stroke="white" stroke-width="3"/>
      <text x="20" y="26" text-anchor="middle" font-size="18" fill="white">📍</text>
      <polygon points="20,48 10,34 30,34" fill="#2563eb"/>
    </svg>
  `),
  iconSize: [40, 50],
  iconAnchor: [20, 50],
  popupAnchor: [0, -50],
});

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Component to auto-fit map bounds when markers change
function FitBounds({ hospital, donor }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (hospital) points.push([hospital.latitude, hospital.longitude]);
    if (donor) points.push([donor.latitude, donor.longitude]);
    if (points.length === 2) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [hospital, donor, map]);
  return null;
}

export default function EmergencyRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingResponse, setUpdatingResponse] = useState(null);

  // Live tracking state
  const [donorLocation, setDonorLocation] = useState(null); // { latitude, longitude, donorProfileId, timestamp }
  const [trackingStatus, setTrackingStatus] = useState('waiting'); // waiting | active | stopped
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const socketRef = useRef(null);

  const load = () => {
    emergencyAPI.get(id).then(({ data }) => setRequest(data.data)).finally(() => setLoading(false));
  };

  // Fetch snapshot of last known location on page load
  useEffect(() => {
    emergencyAPI.getDonorLocation(id)
      .then(({ data }) => {
        const locs = data.data?.locations || [];
        if (locs.length > 0) {
          const loc = locs[0];
          setDonorLocation({ latitude: loc.latitude, longitude: loc.longitude, donorProfileId: loc.donorProfileId, timestamp: loc.updatedAt });
          setTrackingStatus('active');
          setLastUpdateTime(new Date(loc.updatedAt));
        }
      })
      .catch(() => {}); // not critical
  }, [id]);

  useEffect(() => {
    load();
    const token = localStorage.getItem('lifelink_token');
    if (token) {
      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.emit('join-emergency', id);

      // Existing emergency event handlers
      socket.on('emergency:donor-response', load);
      socket.on('emergency:notification-sent', load);
      socket.on('emergency:radius-expanded', load);
      socket.on('emergency:fulfilled', load);
      socket.on('emergency:cancelled', load);

      // Live location events
      socket.on('donor:location-update', (data) => {
        if (data.requestId === id) {
          setDonorLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            donorProfileId: data.donorProfileId,
            timestamp: data.timestamp,
          });
          setTrackingStatus('active');
          setLastUpdateTime(new Date(data.timestamp));
        }
      });

      socket.on('donor:location-stopped', (data) => {
        if (data.requestId === id) {
          setTrackingStatus('stopped');
        }
      });
    }
    return () => socketRef.current?.disconnect();
  }, [id]);

  const cancel = async () => {
    if (!confirm('Cancel this emergency request?')) return;
    await emergencyAPI.cancel(id);
    navigate('/hospital/requests');
  };

  const updateDonorStatus = async (responseId, status) => {
    setUpdatingResponse(responseId);
    try {
      await emergencyAPI.updateDonorStatus(id, responseId, status);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingResponse(null);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!request) return <DashboardLayout><p className="text-gray-500">Request not found</p></DashboardLayout>;

  const responses = request.donorResponses || [];
  const notified = responses.filter((r) => r.status === 'NOTIFIED').length;
  const viewed = responses.filter((r) => r.status === 'VIEWED').length;
  const accepted = responses.filter((r) => ['ACCEPTED', 'ARRIVED', 'DONATION_COMPLETED'].includes(r.status));
  const rejected = responses.filter((r) => r.status === 'REJECTED').length;
  const arrived = responses.filter((r) => ['ARRIVED', 'DONATION_COMPLETED'].includes(r.status)).length;
  const completed = responses.filter((r) => r.status === 'DONATION_COMPLETED').length;
  const isActive = !['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status);

  const hospital = request.hospital;
  const hospitalPos = hospital?.latitude && hospital?.longitude
    ? { latitude: hospital.latitude, longitude: hospital.longitude }
    : null;

  const distanceKm =
    hospitalPos && donorLocation
      ? haversineKm(hospitalPos.latitude, hospitalPos.longitude, donorLocation.latitude, donorLocation.longitude)
      : null;

  const secondsSinceUpdate = lastUpdateTime
    ? Math.round((Date.now() - lastUpdateTime) / 1000)
    : null;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {isActive && <Radio className="h-5 w-5 text-red-500 animate-pulse" />}
            <h1 className="text-2xl font-bold">{BLOOD_GROUP_LABELS[request.bloodGroup]} Emergency</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-gray-600">
            {request.requiredUnits} units required by {formatDateTime(request.requiredBy)}
          </p>
          {hospital && (
            <p className="mt-1 text-sm text-gray-500">
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              {hospital.name}, {hospital.city}
            </p>
          )}
          {request.instructions && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Instructions:</span> {request.instructions}
            </p>
          )}
        </div>
        {isActive && (
          <button onClick={cancel} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
            Cancel Request
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Users, label: 'Notified', value: request.notifiedCount, color: 'text-blue-600' },
          { icon: Clock, label: 'Responded', value: request.respondedCount, color: 'text-purple-600' },
          { icon: CheckCircle2, label: 'Accepted', value: `${request.acceptedUnits}/${request.requiredUnits}`, color: 'text-green-600' },
          { icon: Target, label: 'Radius', value: `${request.currentRadiusKm} km`, color: 'text-orange-600' },
          { icon: UserCheck, label: 'Arrived', value: arrived, color: 'text-teal-600' },
          { icon: Droplets, label: 'Donated', value: completed, color: 'text-red-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-4 text-center shadow-sm">
            <Icon className={`mx-auto h-5 w-5 ${color}`} />
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Flagged Alert */}
      {request.flaggedForReview && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          <span className="font-medium">⚠ Flagged for admin review:</span> {request.flagReason}
        </div>
      )}

      {/* ── LIVE DONOR TRACKING MAP ─────────────────────────────────────────── */}
      {accepted.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Navigation className="h-5 w-5 text-blue-600" />
              Live Donor Tracking
            </h2>
            <div className="flex items-center gap-2 text-sm">
              {trackingStatus === 'active' && (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="text-green-700 font-medium">En Route</span>
                </>
              )}
              {trackingStatus === 'stopped' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-gray-500">Tracking stopped</span>
                </>
              )}
              {trackingStatus === 'waiting' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-yellow-700">Waiting for donor...</span>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          {donorLocation && hospitalPos && (
            <div className="mb-4 flex flex-wrap gap-4 rounded-lg bg-blue-50 p-3 text-sm">
              <span className="font-medium text-blue-800">
                📍 Distance: {distanceKm != null ? `${distanceKm.toFixed(2)} km` : '—'}
              </span>
              {secondsSinceUpdate != null && (
                <span className="text-blue-700">
                  🕐 Last updated:{' '}
                  {secondsSinceUpdate < 60
                    ? `${secondsSinceUpdate}s ago`
                    : `${Math.round(secondsSinceUpdate / 60)}m ago`}
                </span>
              )}
            </div>
          )}

          {/* Map */}
          {hospitalPos ? (
            <div className="h-72 overflow-hidden rounded-xl ring-1 ring-gray-200">
              <MapContainer
                center={[hospitalPos.latitude, hospitalPos.longitude]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds hospital={hospitalPos} donor={donorLocation} />
                <Marker position={[hospitalPos.latitude, hospitalPos.longitude]} icon={HOSPITAL_ICON}>
                  <Popup><strong>🏥 {hospital.name}</strong><br />{hospital.city}</Popup>
                </Marker>
                {donorLocation && (
                  <Marker position={[donorLocation.latitude, donorLocation.longitude]} icon={DONOR_ICON}>
                    <Popup>
                      <strong>📍 Donor En Route</strong>
                      {distanceKm != null && <><br />{distanceKm.toFixed(2)} km from hospital</>}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
              Hospital location not configured — map unavailable.
            </p>
          )}

          {trackingStatus === 'waiting' && (
            <p className="mt-3 text-xs text-gray-400 text-center">
              The donor marker will appear here once the donor starts Live Location Sharing on their device.
            </p>
          )}
        </div>
      )}

      {/* Radius Expansion Timeline */}
      {request.radiusExpansions?.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Radius Expansion Timeline</h2>
          <div className="mt-3 relative">
            <div className="absolute left-3 top-0 h-full w-0.5 bg-gray-200" />
            {request.radiusExpansions.map((e) => (
              <div key={e.id} className="relative mb-3 pl-8 last:mb-0">
                <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-orange-500 bg-white" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{e.fromRadiusKm} → {e.toRadiusKm} km</span>
                  <span className="text-xs text-gray-400">{formatDateTime(e.expandedAt)}</span>
                </div>
                <p className="text-xs text-gray-500">{e.donorsNotified} additional donors notified</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donor Responses */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Donor Responses ({responses.length})</h2>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{notified} notified</span>
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">{viewed} viewed</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">{accepted.length} accepted</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">{rejected} rejected</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {responses.length ? responses.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{r.donorProfile?.user?.fullName || 'Donor'}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                  {r.distanceKm != null && <span><MapPin className="mr-0.5 inline h-3 w-3" />{r.distanceKm.toFixed(1)} km</span>}
                  {r.priorityScore != null && <span>Score: {r.priorityScore.toFixed(1)}</span>}
                  {r.responseTimeMs != null && <span><Clock className="mr-0.5 inline h-3 w-3" />{(r.responseTimeMs / 1000).toFixed(0)}s</span>}
                  {r.notifiedAtRadiusKm != null && <span>Radius: {r.notifiedAtRadiusKm} km</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.donorProfile?.user?.phone && (
                  <a href={`tel:${r.donorProfile.user.phone}`} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                {r.status === 'ACCEPTED' && (
                  <button
                    onClick={() => updateDonorStatus(r.id, 'ARRIVED')}
                    disabled={updatingResponse === r.id}
                    className="rounded-lg bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {updatingResponse === r.id ? '...' : 'Mark Arrived'}
                  </button>
                )}
                {r.status === 'ARRIVED' && (
                  <button
                    onClick={() => updateDonorStatus(r.id, 'DONATION_COMPLETED')}
                    disabled={updatingResponse === r.id}
                    className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {updatingResponse === r.id ? '...' : 'Mark Donated'}
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="py-8 text-center">
              {isActive ? (
                <>
                  <Radio className="mx-auto h-8 w-8 text-gray-300 animate-pulse" />
                  <p className="mt-2 text-sm text-gray-500">Searching for eligible donors...</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">No donor responses recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status banners */}
      {request.status === 'FULFILLED' && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 text-center text-green-800">
          <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
          <p className="mt-1 font-medium">Emergency request fulfilled</p>
          <p className="text-sm">All required units have been accepted. Further notifications have been stopped.</p>
        </div>
      )}
      {request.status === 'CANCELLED' && (
        <div className="mt-4 rounded-lg bg-gray-100 p-4 text-center text-gray-600">
          <p className="font-medium">This emergency request was cancelled</p>
          {request.cancelledAt && <p className="text-sm">Cancelled at: {formatDateTime(request.cancelledAt)}</p>}
        </div>
      )}
      {request.status === 'EXPIRED' && (
        <div className="mt-4 rounded-lg bg-orange-50 p-4 text-center text-orange-800">
          <p className="font-medium">This emergency request has expired</p>
        </div>
      )}
    </DashboardLayout>
  );
}
