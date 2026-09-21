import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { leadsApi } from '../../api/leads.api';
import BookingRequestsDrawer from '../notifications/BookingRequestsDrawer';
import './Header.css';

const PAGE_TITLES = {
  '/therapist/dashboard': { label: 'Dashboard',  sub: 'Welcome back' },
  '/therapist/clients':   { label: 'Clients',    sub: 'Manage your client list' },
  '/therapist/leads':     { label: 'Leads',      sub: 'CRM & enquiry pipeline' },
  '/therapist/schedule':  { label: 'Schedule',   sub: 'Appointments & scheduling' },
  '/therapist/notes':     { label: 'Notes',      sub: 'Clinical session notes' },
  '/therapist/payments':  { label: 'Payments',   sub: 'Revenue & transactions' },
  '/therapist/analytics': { label: 'Analytics',  sub: 'Revenue & growth insights' },
  '/therapist/settings':  { label: 'Settings',   sub: 'Profile, workspace & security' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch pending booking requests for the therapist
  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingRequests(true);
      const res = await leadsApi.list({ limit: 50 });
      const list = res.data?.data?.leads || [];
      const pending = list.filter(
        (l) => l.bookingDetails?.scheduledAt && l.bookingDetails?.status === 'pending'
      );
      setPendingRequests(pending);
    } catch {
      // silently handle background header fetch error
    } finally {
      setLoadingRequests(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingRequests();

    // Listen for appointment updates from other components
    const handleUpdate = () => {
      fetchPendingRequests();
    };

    window.addEventListener('appointment-updated', handleUpdate);
    // Poll every 45 seconds for new online bookings
    const interval = setInterval(fetchPendingRequests, 45000);

    return () => {
      window.removeEventListener('appointment-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [fetchPendingRequests]);

  // Match /therapist/page or /page paths
  const parts = pathname.split('/').filter(Boolean);
  const base = parts[0] === 'therapist'
    ? `/${parts[0]}/${parts[1] || ''}`
    : `/${parts[0] || ''}`;
  const page = PAGE_TITLES[base] || { label: 'Unfazed', sub: '' };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const pendingCount = pendingRequests.length;

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <h1 className="header-title">{page.label}</h1>
          {page.sub && <p className="header-sub">{page.sub}</p>}
        </div>

        <div className="header-right">
          <button
            className={`header-bell ${pendingCount > 0 ? 'has-notifications' : ''}`}
            aria-label={`Notifications ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`}
            onClick={() => setIsDrawerOpen(true)}
            title={pendingCount > 0 ? `${pendingCount} booking request(s) pending` : 'No pending requests'}
          >
            <Bell size={18} />
            {pendingCount > 0 ? (
              <span className="header-bell-badge">{pendingCount}</span>
            ) : (
              <span className="header-bell-dot" />
            )}
          </button>
          <div className="header-user">
            <div className="header-avatar">{initials}</div>
            <div className="header-user-info">
              <p className="header-user-name">{user?.name}</p>
              <p className="header-user-role">Therapist</p>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-over Drawer for Booking Requests */}
      <BookingRequestsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        requests={pendingRequests}
        loading={loadingRequests}
        onHandled={fetchPendingRequests}
      />
    </>
  );
}
