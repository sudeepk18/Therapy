import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Globe, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { leadsApi } from '../../api/leads.api';
import { notificationsApi } from '../../api/notifications.api';
import BookingRequestsDrawer from '../notifications/BookingRequestsDrawer';
import SessionReminderBanner from '../notifications/SessionReminderBanner';
import toast from 'react-hot-toast';
import './Header.css';

const PAGE_TITLES = {
  '/therapist/dashboard': { label: 'Dashboard',  sub: 'Overview of practice activity, sessions & revenue' },
  '/therapist/clients':   { label: 'Clients',    sub: 'Active clients, history & records' },
  '/therapist/leads':     { label: 'Leads',      sub: 'Enquiry pipeline & intake requests' },
  '/therapist/schedule':  { label: 'Schedule',   sub: 'Upcoming sessions & calendar slots' },
  '/therapist/notes':     { label: 'Notes',      sub: 'Clinical SOAP & session notes' },
  '/therapist/payments':  { label: 'Payments',   sub: 'Invoices, transactions & revenue breakdown' },
  '/therapist/analytics': { label: 'Analytics',  sub: 'Performance, retention & revenue insights' },
  '/therapist/settings':  { label: 'Settings',   sub: 'Profile, custom domain & booking setup' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [unreadRemindersCount, setUnreadRemindersCount] = useState(0);

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

  // Fetch session reminder notifications
  const fetchReminders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getNotifications({ limit: 40 });
      const data = res.data?.data || {};
      const notifs = data.notifications || [];
      setReminders(notifs);
      setUnreadRemindersCount(data.unreadCount || 0);

      // Trigger browser desktop notification for 5-min urgent alerts
      const fiveMinAlert = notifs.find(
        (n) => !n.isRead && n.subType === 'five_minutes' && !sessionStorage.getItem(`desktop_notif_${n._id}`)
      );
      if (fiveMinAlert && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(fiveMinAlert.title, {
            body: fiveMinAlert.message,
            icon: '/favicon.svg',
          });
          sessionStorage.setItem(`desktop_notif_${fiveMinAlert._id}`, 'true');
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    } catch {
      // silently handle background reminder fetch error
    }
  }, [user]);

  useEffect(() => {
    fetchPendingRequests();
    fetchReminders();

    // Ask for desktop notification permission once if not prompted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const handleUpdate = () => {
      fetchPendingRequests();
      fetchReminders();
    };

    window.addEventListener('appointment-updated', handleUpdate);
    window.addEventListener('session-updated', handleUpdate);
    const interval = setInterval(() => {
      fetchPendingRequests();
      fetchReminders();
    }, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('appointment-updated', handleUpdate);
      window.removeEventListener('session-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [fetchPendingRequests, fetchReminders]);

  const handleMarkReminderRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setReminders((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isRead: true } : r))
      );
      setUnreadRemindersCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRemindersRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setReminders((prev) => prev.map((r) => ({ ...r, isRead: true })));
      setUnreadRemindersCount(0);
      toast.success('All reminders marked as read');
    } catch {
      toast.error('Failed to mark reminders as read');
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await notificationsApi.deleteNotification(id);
      setReminders((prev) => prev.filter((r) => r._id !== id));
      toast.success('Reminder dismissed');
    } catch {
      toast.error('Failed to dismiss reminder');
    }
  };

  const parts = pathname.split('/').filter(Boolean);
  const base = parts[0] === 'therapist'
    ? `/${parts[0]}/${parts[1] || ''}`
    : `/${parts[0] || ''}`;
  const page = PAGE_TITLES[base] || { label: 'Unfazed', sub: 'Therapy Practice Suite' };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TH';

  const pendingCount = pendingRequests.length;
  const totalNotifications = pendingCount + unreadRemindersCount;
  const slug = user?.therapistId?.slug || user?.therapistSlug || user?.slug;

  const handleCopyPortalLink = () => {
    if (!slug) {
      toast('Set your booking slug in Settings', { icon: '⚙️' });
      return;
    }
    const url = `${window.location.origin}/client/${slug}/booking`;
    navigator.clipboard.writeText(url);
    toast.success('Client booking link copied to clipboard!');
  };

  return (
    <>
      {/* Real-time Sticky Reminder Banner (if session within 5 mins or 1 hour) */}
      <SessionReminderBanner
        reminders={reminders}
        onDismiss={handleMarkReminderRead}
      />

      <header className="app-header">
        <div className="header-left">
          <div className="header-title-row">
            <h1 className="header-title">{page.label}</h1>
            <span className="header-live-badge">
              <span className="live-pulse-dot" />
              Live Workspace
            </span>
          </div>
          {page.sub && <p className="header-sub">{page.sub}</p>}
        </div>

        <div className="header-right">
          {/* Quick link to client portal */}
          {slug && (
            <button
              className="header-portal-btn"
              onClick={handleCopyPortalLink}
              title="Copy Client Booking Link"
            >
              <Globe size={14} className="header-portal-icon" />
              <span>Client Portal</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            className={`header-bell ${totalNotifications > 0 ? 'has-notifications' : ''}`}
            aria-label={`Notifications ${totalNotifications > 0 ? `(${totalNotifications} pending/unread)` : ''}`}
            onClick={() => setIsDrawerOpen(true)}
            title={
              totalNotifications > 0
                ? `${unreadRemindersCount} reminder(s), ${pendingCount} booking request(s)`
                : 'No pending alerts'
            }
          >
            <Bell size={18} />
            {totalNotifications > 0 ? (
              <span className="header-bell-badge animate-pulse">{totalNotifications}</span>
            ) : (
              <span className="header-bell-dot" />
            )}
          </button>

          {/* Therapist Avatar & Role */}
          <div className="header-user">
            <div className="header-avatar-ring">
              <div className="header-avatar">{initials}</div>
            </div>
            <div className="header-user-info">
              <p className="header-user-name">{user?.name || 'Therapist'}</p>
              <p className="header-user-role">Licensed Therapist</p>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-over Drawer for Notifications & Booking Requests */}
      <BookingRequestsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        requests={pendingRequests}
        loading={loadingRequests}
        onHandled={fetchPendingRequests}
        reminders={reminders}
        unreadRemindersCount={unreadRemindersCount}
        onMarkReminderRead={handleMarkReminderRead}
        onMarkAllRemindersRead={handleMarkAllRemindersRead}
        onDeleteReminder={handleDeleteReminder}
      />
    </>
  );
}
