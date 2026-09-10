import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campAPI } from '../../services/endpoints';
import { formatDate } from '../../utils/constants';
import { MapPin, Calendar } from 'lucide-react';

export default function CampsList() {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campAPI.list({ status: 'APPROVED' }).then(({ data }) => setCamps(data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="text-xl font-bold">LifeLink</Link>
          <Link to="/login" className="text-sm text-primary-600">Login</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold">Donation Camps</h1>
        <p className="mt-1 text-gray-600">Find and register for upcoming blood donation camps</p>
        {loading ? (
          <p className="mt-8 text-gray-500">Loading camps...</p>
        ) : camps.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp) => (
              <Link key={camp.id} to={`/camps/${camp.id}`} className="rounded-xl bg-white p-6 shadow-sm hover:border-primary-200 border border-transparent">
                <h2 className="font-semibold">{camp.name}</h2>
                <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" /> {formatDate(camp.date)} • {camp.startTime}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" /> {camp.city}
                </div>
                <p className="mt-2 text-xs text-gray-400">{camp.registeredCount}/{camp.capacity} registered</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-gray-500">No upcoming camps available.</p>
        )}
      </main>
    </div>
  );
}
