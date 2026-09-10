import { useState } from 'react';
import { campAPI } from '../../services/endpoints';
import DashboardLayout from '../../layouts/DashboardLayout';
import { QrCode } from 'lucide-react';

export default function CampCheckIn() {
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const checkIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await campAPI.checkIn(qrCode.trim());
      setMessage('Checked in successfully!');
      setQrCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold">Camp Check-In</h1>
      <form onSubmit={checkIn} className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <QrCode className="h-16 w-16 text-primary-600" />
        </div>
        <p className="mb-4 text-center text-sm text-gray-600">Enter the camp QR code to check in</p>
        {message && <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Camp QR code"
          className="w-full rounded-lg border px-3 py-2" required />
        <button type="submit" className="mt-4 w-full rounded-lg bg-primary-600 py-2.5 text-white">Check In</button>
      </form>
    </DashboardLayout>
  );
}
