import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Droplet, LogOut, Menu, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/endpoints';

const NAV_ITEMS = {
  DONOR: [
    { to: '/donor/dashboard', label: 'Dashboard' },
    { to: '/donor/profile', label: 'Profile' },
    { to: '/donor/history', label: 'History' },
    { to: '/donor/appointments', label: 'Appointments' },
    { to: '/camps', label: 'Camps' },
    { to: '/donor/notifications', label: 'Notifications' },
  ],
  HOSPITAL: [
    { to: '/hospital/dashboard', label: 'Dashboard' },
    { to: '/hospital/profile', label: 'Profile' },
    { to: '/hospital/requests', label: 'Requests' },
    { to: '/hospital/requests/new', label: 'New Emergency' },
    { to: '/blood-search', label: 'Find Blood' },
  ],
  BLOOD_BANK: [
    { to: '/blood-bank/dashboard', label: 'Dashboard' },
    { to: '/blood-bank/profile', label: 'Profile' },
    { to: '/blood-bank/inventory', label: 'Inventory' },
    { to: '/blood-bank/appointments', label: 'Appointments' },
    { to: '/blood-bank/donations', label: 'Donations' },
    { to: '/camps/manage', label: 'Camps' },
  ],
  CAMP_ORGANIZER: [
    { to: '/camps/manage', label: 'My Camps' },
    { to: '/camps', label: 'All Camps' },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/verification', label: 'Verification' },
    { to: '/admin/flagged', label: 'Flagged' },
  ],
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navItems = NAV_ITEMS[user?.role] || [];

  useEffect(() => {
    notificationAPI.list({ unreadOnly: true, limit: 1 })
      .then(({ data }) => setUnreadCount(data.data?.total || 0))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Droplet className="h-7 w-7 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">LifeLink</span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to) && item.to.length > 5);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user?.role === 'DONOR' && (
              <Link to="/donor/notifications" className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <span className="hidden text-sm text-gray-500 sm:block">{user?.fullName || user?.phone}</span>
            <span className="hidden rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 sm:block">
              {user?.role?.replace('_', ' ')}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-gray-200 bg-white px-4 py-2 md:hidden">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
