import { useEffect, useState } from 'react';
import { notificationAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import LoadingSpinner, { EmptyState } from '../../components/LoadingSpinner';
import { formatDateTime } from '../../utils/constants';

export default function DonorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      notificationAPI.list(),
      notificationAPI.getPreferences(),
    ]).then(([n, p]) => {
      setNotifications(n.data.data.notifications || n.data.data);
      setPrefs(p.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    await notificationAPI.markRead(id);
    load();
  };

  const updatePref = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await notificationAPI.updatePreferences({ [key]: value });
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Notifications</h1>

      {prefs && (
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Preferences</h2>
          <div className="mt-4 space-y-3">
            {[
              ['emergencyAlerts', 'Emergency alerts'],
              ['appointmentReminders', 'Appointment reminders'],
              ['campReminders', 'Camp reminders'],
              ['requestUpdates', 'Request updates'],
              ['accountUpdates', 'Account updates'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <input type="checkbox" checked={prefs[key]} onChange={(e) => updatePref(key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600" />
              </label>
            ))}
          </div>
        </div>
      )}

      {notifications.length ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-xl p-4 shadow-sm ${n.isRead ? 'bg-gray-50' : 'bg-white border-l-4 border-primary-500'}`}>
              <div className="flex justify-between">
                <h3 className="font-medium">{n.title}</h3>
                {!n.isRead && (
                  <button onClick={() => markRead(n.id)} className="text-xs text-primary-600 hover:underline">Mark read</button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">{n.body}</p>
              <p className="mt-2 text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" description="You'll receive alerts for emergencies and appointments here." />
      )}
    </DashboardLayout>
  );
}
