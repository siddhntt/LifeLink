import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { hospitalAPI, emergencyAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDateTime } from '../../utils/constants';
import { AlertTriangle, Plus, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function HospitalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const load = () => {
    hospitalAPI.getDashboard().then(({ data: res }) => setData(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const token = localStorage.getItem('lifelink_token');
    if (token) {
      socketRef.current = io(SOCKET_URL, { auth: { token } });
      socketRef.current.on('emergency:donor-response', load);
      socketRef.current.on('emergency:notification-sent', load);
      socketRef.current.on('emergency:radius-expanded', load);
      socketRef.current.on('emergency:fulfilled', load);
    }
    return () => socketRef.current?.disconnect();
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const { hospital, activeEmergencies } = data;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hospital Dashboard</h1>
          <p className="text-gray-600">{hospital?.name}</p>
        </div>
        {hospital?.verificationStatus === 'VERIFIED' ? (
          <Link to="/hospital/requests/new" className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            <Plus className="h-4 w-4" /> Emergency Request
          </Link>
        ) : (
          <span className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800">Pending Verification</span>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Active Emergency Requests</h2>
        </div>
        {activeEmergencies?.length ? (
          <div className="mt-4 space-y-4">
            {activeEmergencies.map((req) => (
              <Link key={req.id} to={`/hospital/requests/${req.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-red-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">{BLOOD_GROUP_LABELS[req.bloodGroup]}</span>
                    <span className="text-gray-600">× {req.requiredUnits} units</span>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="mt-2 flex gap-4 text-sm text-gray-600">
                  <span>Notified: {req.notifiedCount}</span>
                  <span>Accepted: {req.acceptedUnits}/{req.requiredUnits}</span>
                  <span>Radius: {req.currentRadiusKm} km</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No active emergencies" description="Create an emergency request when blood is urgently needed." />
        )}
      </div>
    </DashboardLayout>
  );
}
