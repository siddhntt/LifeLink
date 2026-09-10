import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campAPI } from '../../services/endpoints';
import { useAuth } from '../../context/AuthContext';
import MapView from '../../components/MapView';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDate } from '../../utils/constants';

export default function CampDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [camp, setCamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    campAPI.get(id).then(({ data }) => setCamp(data.data)).finally(() => setLoading(false));
  }, [id]);

  const register = async () => {
    try {
      await campAPI.register(id);
      setMessage('Registered successfully!');
      const { data } = await campAPI.get(id);
      setCamp(data.data);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>;
  if (!camp) return <p>Camp not found</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-4">
        <Link to="/camps" className="text-sm text-primary-600">← Back to camps</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">{camp.name}</h1>
        <p className="mt-2 text-gray-600">{formatDate(camp.date)} • {camp.startTime}–{camp.endTime}</p>
        <p className="text-gray-600">{camp.address}, {camp.city}</p>
        {camp.description && <p className="mt-4 text-sm">{camp.description}</p>}

        <div className="mt-6">
          <MapView center={[camp.latitude, camp.longitude]} markers={[{ id: camp.id, lat: camp.latitude, lng: camp.longitude, label: camp.name }]} />
        </div>

        <p className="mt-4 text-sm text-gray-500">{camp.registeredCount}/{camp.capacity} registered</p>

        {message && <p className="mt-4 text-sm text-primary-600">{message}</p>}

        {user?.role === 'DONOR' ? (
          <button onClick={register} className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700">
            Register for Camp
          </button>
        ) : !user ? (
          <Link to="/login" className="mt-4 inline-block rounded-lg bg-primary-600 px-6 py-2 text-white">Login to Register</Link>
        ) : null}
      </main>
    </div>
  );
}
