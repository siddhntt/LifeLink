import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import { useFCM } from './hooks/useFCM';
import { useSocket } from './context/SocketContext';
import { useToast } from './context/ToastContext';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import DonorDashboard from './pages/donor/DonorDashboard';
import DonorProfile from './pages/donor/DonorProfile';
import DonorHistory from './pages/donor/DonorHistory';
import DonorAppointments from './pages/donor/DonorAppointments';
import DonorNotifications from './pages/donor/DonorNotifications';
import EmergencyResponsePage from './pages/donor/EmergencyResponsePage';
import CampCheckIn from './pages/donor/CampCheckIn';

import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalProfile from './pages/hospital/HospitalProfile';
import HospitalRegister from './pages/hospital/HospitalRegister';
import HospitalRequests from './pages/hospital/HospitalRequests';
import HospitalBloodRequests from './pages/hospital/HospitalBloodRequests';
import CreateEmergencyRequest from './pages/hospital/CreateEmergencyRequest';
import EmergencyRequestDetail from './pages/hospital/EmergencyRequestDetail';

import BloodBankRegister from './pages/blood-bank/BloodBankRegister';
import BloodBankDashboard from './pages/blood-bank/BloodBankDashboard';
import BloodBankProfile from './pages/blood-bank/BloodBankProfile';
import BloodBankInventory from './pages/blood-bank/BloodBankInventory';
import BloodBankAppointments from './pages/blood-bank/BloodBankAppointments';
import BloodBankDonations from './pages/blood-bank/BloodBankDonations';

import CampsList from './pages/camps/CampsList';
import CampDetail from './pages/camps/CampDetail';
import CampManage from './pages/camps/CampManage';
import NGORegister from './pages/camps/NGORegister';

import BloodSearchPage from './pages/BloodSearchPage';
import NearbyMapPage from './pages/NearbyMapPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVerification from './pages/admin/AdminVerification';
import AdminFlaggedEmergencies from './pages/admin/AdminFlaggedEmergencies';

function GlobalSocketListener() {
  useFCM();
  const { on } = useSocket();
  const { addToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const unsubs = [];

    // ─── Notification received (from server push) ─────────────────────────
    unsubs.push(on('notification:new', (data) => {
      addToast({
        title: data.title || 'New Notification',
        body: data.body,
        type: data.type === 'EMERGENCY_REQUEST' ? 'emergency' : 'notification',
        link: data.emergencyRequestId
          ? `/donor/emergency/${data.emergencyRequestId}`
          : '/donor/notifications',
        duration: data.type === 'EMERGENCY_REQUEST' ? 15000 : 6000,
      });
    }));

    // ─── Emergency events (for hospital users watching their requests) ────
    unsubs.push(on('emergency:donor-response', (data) => {
      if (user.role === 'HOSPITAL') {
        const action = data.response === 'ACCEPTED' ? '✅ accepted' : '❌ declined';
        addToast({
          title: `Donor ${action} your request`,
          body: `${data.donorName} responded in ${Math.round(data.responseTimeMs / 1000)}s`,
          type: data.response === 'ACCEPTED' ? 'success' : 'info',
          link: `/hospital/requests/${data.requestId}`,
        });
      }
    }));

    unsubs.push(on('emergency:fulfilled', (data) => {
      if (user.role === 'HOSPITAL') {
        addToast({
          title: '🎉 Emergency Request Fulfilled!',
          body: `All ${data.acceptedUnits} required units have been accepted.`,
          type: 'success',
          link: `/hospital/requests/${data.requestId}`,
          duration: 10000,
        });
      }
    }));

    unsubs.push(on('emergency:radius-expanded', (data) => {
      if (user.role === 'HOSPITAL') {
        addToast({
          title: 'Search Radius Expanded',
          body: `Expanded from ${data.fromRadiusKm} km to ${data.toRadiusKm} km (Stage ${data.stage})`,
          type: 'info',
          link: `/hospital/requests/${data.requestId}`,
        });
      }
    }));

    return () => unsubs.forEach((u) => u());
  }, [user, on, addToast]);

  return null;
}

export default function App() {
  return (
    <>
      <GlobalSocketListener />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Donor Routes */}
        <Route path="/donor/dashboard" element={<ProtectedRoute roles={['DONOR']}><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/profile" element={<ProtectedRoute roles={['DONOR']}><DonorProfile /></ProtectedRoute>} />
        <Route path="/donor/history" element={<ProtectedRoute roles={['DONOR']}><DonorHistory /></ProtectedRoute>} />
        <Route path="/donor/appointments" element={<ProtectedRoute roles={['DONOR']}><DonorAppointments /></ProtectedRoute>} />
        <Route path="/donor/notifications" element={<ProtectedRoute roles={['DONOR']}><DonorNotifications /></ProtectedRoute>} />
        <Route path="/donor/emergency/:id" element={<ProtectedRoute roles={['DONOR']}><EmergencyResponsePage /></ProtectedRoute>} />
        <Route path="/donor/camp-check-in" element={<ProtectedRoute roles={['DONOR']}><CampCheckIn /></ProtectedRoute>} />

        {/* Hospital Routes */}
        <Route path="/hospital/dashboard" element={<ProtectedRoute roles={['HOSPITAL']}><HospitalDashboard /></ProtectedRoute>} />
        <Route path="/hospital/profile" element={<ProtectedRoute roles={['HOSPITAL']}><HospitalProfile /></ProtectedRoute>} />
        <Route path="/hospital/register" element={<ProtectedRoute roles={['HOSPITAL']}><HospitalRegister /></ProtectedRoute>} />
        <Route path="/hospital/requests" element={<ProtectedRoute roles={['HOSPITAL']}><HospitalRequests /></ProtectedRoute>} />
        <Route path="/hospital/blood-requests" element={<ProtectedRoute roles={['HOSPITAL']}><HospitalBloodRequests /></ProtectedRoute>} />
        <Route path="/hospital/requests/new" element={<ProtectedRoute roles={['HOSPITAL']}><CreateEmergencyRequest /></ProtectedRoute>} />
        <Route path="/hospital/requests/:id" element={<ProtectedRoute roles={['HOSPITAL']}><EmergencyRequestDetail /></ProtectedRoute>} />

        {/* Blood Bank Routes */}
        <Route path="/blood-bank/dashboard" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankDashboard /></ProtectedRoute>} />
        <Route path="/blood-bank/register" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankRegister /></ProtectedRoute>} />
        <Route path="/blood-bank/profile" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankProfile /></ProtectedRoute>} />
        <Route path="/blood-bank/inventory" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankInventory /></ProtectedRoute>} />
        <Route path="/blood-bank/appointments" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankAppointments /></ProtectedRoute>} />
        <Route path="/blood-bank/donations" element={<ProtectedRoute roles={['BLOOD_BANK']}><BloodBankDonations /></ProtectedRoute>} />

        {/* Camp Routes */}
        <Route path="/camps" element={<CampsList />} />
        <Route path="/camps/:id" element={<CampDetail />} />
        <Route path="/camps/manage" element={<ProtectedRoute roles={['BLOOD_BANK', 'CAMP_ORGANIZER']}><CampManage /></ProtectedRoute>} />
        <Route path="/camps/ngo-register" element={<ProtectedRoute roles={['CAMP_ORGANIZER']}><NGORegister /></ProtectedRoute>} />

        {/* Shared Routes */}
        <Route path="/blood-search" element={<ProtectedRoute roles={['HOSPITAL', 'DONOR', 'BLOOD_BANK', 'ADMIN']}><BloodSearchPage /></ProtectedRoute>} />
        <Route path="/nearby" element={<NearbyMapPage />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/verification" element={<ProtectedRoute roles={['ADMIN']}><AdminVerification /></ProtectedRoute>} />
        <Route path="/admin/flagged" element={<ProtectedRoute roles={['ADMIN']}><AdminFlaggedEmergencies /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
