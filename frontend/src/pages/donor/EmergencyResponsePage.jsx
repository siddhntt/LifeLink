import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { emergencyAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { MapPin, Navigation, WifiOff, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const THROTTLE_MS = 7000;       // send location every ~7s
const MIN_DISTANCE_M = 30;      // or when moved at least 30 metres

function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  STOPPED: 'stopped',
  DISCONNECTED: 'disconnected',
};

const STATUS_UI = {
  [STATUS.IDLE]: { color: 'bg-gray-100 text-gray-700', icon: MapPin, text: 'Location sharing not started' },
  [STATUS.REQUESTING]: { color: 'bg-blue-100 text-blue-700', icon: Navigation, text: 'Requesting location permission...' },
  [STATUS.ACTIVE]: { color: 'bg-green-100 text-green-700', icon: Navigation, text: 'Location sharing active' },
  [STATUS.DENIED]: { color: 'bg-red-100 text-red-700', icon: AlertTriangle, text: 'Location permission denied' },
  [STATUS.UNAVAILABLE]: { color: 'bg-orange-100 text-orange-700', icon: AlertTriangle, text: 'Location unavailable' },
  [STATUS.STOPPED]: { color: 'bg-gray-100 text-gray-700', icon: XCircle, text: 'Location sharing stopped' },
  [STATUS.DISCONNECTED]: { color: 'bg-yellow-100 text-yellow-700', icon: WifiOff, text: 'Connection lost — reconnecting...' },
};

export default function EmergencyResponsePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(STATUS.IDLE);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const lastSentTimeRef = useRef(0);

  useEffect(() => {
    emergencyAPI.get(id).then(({ data }) => {
      const req = data.data;
      setRequest(req);
      // Check if this donor has already accepted
      const responses = req.donorResponses || [];
      const myResponse = responses.find(
        (r) => r.status === 'ACCEPTED' || r.status === 'ARRIVED'
      );
      if (myResponse) setHasAccepted(true);
    }).finally(() => setLoading(false));
  }, [id]);

  // Socket setup
  useEffect(() => {
    const token = localStorage.getItem('lifelink_token');
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (trackingStatus === STATUS.DISCONNECTED) {
        setTrackingStatus(STATUS.ACTIVE);
      }
    });

    socket.on('disconnect', () => {
      if (trackingStatus === STATUS.ACTIVE) {
        setTrackingStatus(STATUS.DISCONNECTED);
      }
    });

    socket.on('donor:tracking-joined', () => {
      console.log('[Tracking] Joined emergency room');
    });

    socket.on('donor:tracking-stopped', ({ reason }) => {
      stopTracking();
      alert(reason || 'Tracking stopped');
    });

    socket.on('error', (err) => {
      console.error('[Socket] Error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // only on mount

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('donor:location-stop', { requestId: id });
    }
    lastPositionRef.current = null;
    lastSentTimeRef.current = 0;
    setTrackingStatus(STATUS.STOPPED);
  }, [id]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setTrackingStatus(STATUS.UNAVAILABLE);
      return;
    }

    setTrackingStatus(STATUS.REQUESTING);

    // Join the socket room first
    if (socketRef.current) {
      socketRef.current.emit('donor:join-tracking', id);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = Date.now();

        // Throttle: only send if enough time passed OR enough distance moved
        const timeSinceLast = now - lastSentTimeRef.current;
        const last = lastPositionRef.current;
        const distMoved = last
          ? haversineMetres(last.latitude, last.longitude, latitude, longitude)
          : Infinity;

        if (timeSinceLast < THROTTLE_MS && distMoved < MIN_DISTANCE_M) return;

        lastSentTimeRef.current = now;
        lastPositionRef.current = { latitude, longitude };

        if (socketRef.current?.connected) {
          socketRef.current.emit('donor:location-update', {
            requestId: id,
            latitude,
            longitude,
            accuracy,
          });
          setLastUpdateTime(new Date());
          setTrackingStatus(STATUS.ACTIVE);
        } else {
          setTrackingStatus(STATUS.DISCONNECTED);
        }
      },
      (err) => {
        if (err.code === 1) { // PERMISSION_DENIED
          setTrackingStatus(STATUS.DENIED);
        } else {
          setTrackingStatus(STATUS.UNAVAILABLE);
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  }, [id]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const respond = async (response) => {
    setResponding(true);
    try {
      await emergencyAPI.respond(id, response);
      if (response === 'ACCEPTED') {
        setHasAccepted(true);
      } else {
        navigate('/donor/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond');
    } finally {
      setResponding(false);
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!request) return <DashboardLayout><p>Emergency request not found</p></DashboardLayout>;

  const isActive = !['FULFILLED', 'CANCELLED', 'EXPIRED'].includes(request.status);
  const trackingUi = STATUS_UI[trackingStatus];
  const TrackingIcon = trackingUi.icon;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg space-y-4">
        {/* Emergency Banner */}
        <div className="rounded-xl bg-red-50 p-5 text-center ring-1 ring-red-200">
          <h1 className="text-xl font-bold text-red-800">Emergency Blood Required</h1>
          <p className="mt-2 text-4xl font-bold text-red-600">{BLOOD_GROUP_LABELS[request.bloodGroup]}</p>
        </div>

        {/* Details */}
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
          <div className="flex justify-between"><span className="text-gray-600">Hospital</span><span className="font-medium">{request.hospital?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Units Required</span><span className="font-medium">{request.requiredUnits}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Required By</span><span className="font-medium">{formatDateTime(request.requiredBy)}</span></div>
          {request.instructions && (
            <div><span className="text-gray-600">Instructions:</span><p className="mt-1 text-sm">{request.instructions}</p></div>
          )}
          <p className="text-xs text-gray-400 pt-1">Patient identity is not shared. Only respond if you are available and eligible.</p>
        </div>

        {/* Accept / Decline (shown if not yet accepted) */}
        {!hasAccepted && isActive && (
          <div className="flex gap-3">
            <button onClick={() => respond('ACCEPTED')} disabled={responding}
              className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
              {responding ? 'Processing...' : 'Accept'}
            </button>
            <button onClick={() => respond('REJECTED')} disabled={responding}
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Decline
            </button>
          </div>
        )}

        {/* Live Location Tracking (shown after accepting) */}
        {hasAccepted && isActive && (
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                Live Location Sharing
              </h2>
              {lastUpdateTime && trackingStatus === STATUS.ACTIVE && (
                <span className="text-xs text-gray-400">
                  Updated {Math.round((Date.now() - lastUpdateTime) / 1000)}s ago
                </span>
              )}
            </div>

            {/* Status indicator */}
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${trackingUi.color}`}>
              <TrackingIcon className="h-4 w-4 flex-shrink-0" />
              <span>{trackingUi.text}</span>
              {trackingStatus === STATUS.ACTIVE && (
                <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
              )}
            </div>

            {/* Privacy notice */}
            <p className="mb-4 text-xs text-gray-500">
              📍 Your location is shared <strong>only</strong> with the hospital during this emergency.
              It stops automatically when you click Stop or when the emergency ends.
            </p>

            {/* Browser limitation notice */}
            {!('geolocation' in navigator) && (
              <div className="mb-3 rounded-lg bg-orange-50 p-3 text-xs text-orange-700 ring-1 ring-orange-200">
                ⚠ Your browser does not support location sharing. Please use a modern browser.
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {(trackingStatus === STATUS.IDLE || trackingStatus === STATUS.STOPPED || trackingStatus === STATUS.DENIED || trackingStatus === STATUS.UNAVAILABLE) && (
                <button
                  onClick={startTracking}
                  disabled={!('geolocation' in navigator)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  Start Live Location Sharing
                </button>
              )}

              {(trackingStatus === STATUS.ACTIVE || trackingStatus === STATUS.REQUESTING || trackingStatus === STATUS.DISCONNECTED) && (
                <button
                  onClick={stopTracking}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Stop Live Location Sharing
                </button>
              )}
            </div>
          </div>
        )}

        {/* Accepted success */}
        {hasAccepted && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">You have accepted this request</p>
              <p className="text-sm text-green-700">Please proceed to {request.hospital?.name} as soon as possible.</p>
            </div>
          </div>
        )}

        {/* Request ended */}
        {!isActive && (
          <div className="rounded-xl bg-gray-50 p-4 text-center text-gray-600 ring-1 ring-gray-200">
            <p className="font-medium">This emergency request is no longer active ({request.status})</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
