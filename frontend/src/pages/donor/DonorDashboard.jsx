import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { donorAPI } from '../../services/endpoints';
import { useSocketReload } from '../../context/SocketContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { BLOOD_GROUP_LABELS, formatDate, formatDateTime } from '../../utils/constants';
import { Heart, Calendar, AlertTriangle, ToggleLeft, ToggleRight, MapPin } from 'lucide-react';

function formatLocationAge(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DonorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(() => {
    donorAPI.getDashboard().then(({ data: res }) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Auto-refresh when new emergency notification arrives
  useSocketReload(['notification:new'], load);

  const toggleAvailability = async () => {
    if (!data?.profile) return;
    setToggling(true);
    const newStatus = data.profile.availability === 'AVAILABLE' ? 'NOT_AVAILABLE' : 'AVAILABLE';
    await donorAPI.updateAvailability(newStatus);
    load();
    setToggling(false);
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const { profile, evaluation, donations, appointments, emergencyResponses, nearbyCamps, stats } = data;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Donor Dashboard</h1>
        <p className="text-gray-600">Welcome back, manage your donation profile and respond to emergencies</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Your Status</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={profile?.bloodGroup ? BLOOD_GROUP_LABELS[profile.bloodGroup] : 'Unknown'} />
                <StatusBadge status={evaluation?.status} />
                <StatusBadge status={profile?.availability} />
              </div>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              {profile?.availability === 'AVAILABLE' ? (
                <><ToggleRight className="h-5 w-5 text-green-600" /> Available</>
              ) : (
                <><ToggleLeft className="h-5 w-5 text-gray-400" /> Not Available</>
              )}
            </button>
          </div>

          {evaluation?.nextEligibleDate && (
            <p className="mt-3 text-sm text-gray-600">
              Next eligible donation: {formatDate(evaluation.nextEligibleDate)}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">{evaluation?.disclaimer}</p>

          {/* Location freshness indicator */}
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            {profile?.locationUpdatedAt ? (
              <span className="text-gray-500">
                📍 Location updated {formatLocationAge(profile.locationUpdatedAt)}
              </span>
            ) : profile?.latitude ? (
              <span className="text-amber-600">
                ⚠️ Using registration location — open the app regularly to keep it fresh
              </span>
            ) : (
              <span className="text-red-500">
                ❌ No location set — enable location to receive emergency alerts
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Stats</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between"><span className="text-gray-600">Total Donations</span><span className="font-semibold">{stats.totalDonations}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Emergency Responses</span><span className="font-semibold">{stats.responseCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Accepted</span><span className="font-semibold">{stats.acceptCount}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">Recent Emergency Requests</h2>
          </div>
          {emergencyResponses?.length ? (
            <ul className="mt-4 space-y-3">
              {emergencyResponses.map((r) => (
                <li key={r.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.emergencyRequest?.hospital?.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {BLOOD_GROUP_LABELS[r.emergencyRequest?.bloodGroup]} • {formatDateTime(r.notifiedAt)}
                  </p>
                  {['NOTIFIED', 'VIEWED'].includes(r.status) && (
                    <div className="mt-2 flex gap-2">
                      <Link to={`/donor/emergency/${r.emergencyRequestId}`} className="rounded bg-green-600 px-3 py-1 text-xs text-white">Respond</Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No emergency requests" description="You'll be notified when nearby emergencies need your blood group." />
          )}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-600" />
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
          </div>
          {appointments?.length ? (
            <ul className="mt-4 space-y-3">
              {appointments.map((a) => (
                <li key={a.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{a.bloodBank?.name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-gray-600">{formatDate(a.slot?.date)} • {a.slot?.startTime}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No appointments" action={<Link to="/donor/appointments" className="text-primary-600 hover:underline">Book an appointment</Link>} />
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold">Nearby Donation Camps</h2>
        </div>
        {nearbyCamps?.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {nearbyCamps.map((camp) => (
              <Link key={camp.id} to={`/camps/${camp.id}`} className="rounded-lg border border-gray-200 p-4 hover:border-primary-300">
                <h3 className="font-medium">{camp.name}</h3>
                <p className="text-sm text-gray-600">{camp.city} • {formatDate(camp.date)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming camps nearby" action={<Link to="/camps" className="text-primary-600 hover:underline">Browse all camps</Link>} />
        )}
      </div>
    </DashboardLayout>
  );
}
