import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Layouts ───────────────────────────────────────────────────────────────────
import AppLayout          from '../layouts/AppLayout';
import AuthLayout         from '../layouts/AuthLayout';
import ClientPortalLayout from '../layouts/ClientPortalLayout';

// ── Auth pages ────────────────────────────────────────────────────────────────
import LoginPage        from '../pages/auth/LoginPage';
import RegisterPage     from '../pages/auth/RegisterPage';
import ClientLoginPage  from '../pages/auth/ClientLoginPage';
import SetPasswordPage  from '../pages/auth/SetPasswordPage';

// ── Therapist pages ───────────────────────────────────────────────────────────
import Dashboard    from '../pages/therapist/Dashboard';
import Clients      from '../pages/therapist/Clients';
import Schedule     from '../pages/therapist/Schedule';
import Notes        from '../pages/therapist/Notes';
import Analytics    from '../pages/therapist/Analytics';
import Settings     from '../pages/therapist/SettingsPage';
import ClientDetail from '../pages/clients/ClientDetailPage';
import LeadsPage    from '../pages/leads/LeadsPage';
import PaymentsPage from '../pages/payments/PaymentsPage';

// ── Client pages ──────────────────────────────────────────────────────────────
import ClientPortal       from '../pages/client/ClientPortal';
import BookingPage        from '../pages/client/BookingPage';
import Payment            from '../pages/client/Payment';
import ClientIntakeConsent from '../pages/client/ClientIntakeConsent';
import ClientDashboard    from '../pages/client/ClientDashboard';

// ── Loading spinner ───────────────────────────────────────────────────────────
import { Spinner } from '../components/common/Common';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * RequireTherapist
 * Protects all /therapist/* routes.
 * Redirects unauthenticated users to /login.
 */
function RequireTherapist({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

/**
 * RequireClient
 * Protects all /client/:slug/portal routes.
 * Redirects unauthenticated clients to the slug-scoped login page.
 */
function RequireClient({ children }) {
  const { user, userRole, loading } = useAuth();
  // Extract slug from the current URL to build the login redirect
  const match = window.location.pathname.match(/^\/client\/([^/]+)/);
  const slug  = match ? match[1] : '';

  if (loading) return <Spinner fullPage />;
  if (!user || userRole !== 'client') return <Navigate to={`/client/${slug}/login`} replace />;
  return children;
}

/**
 * RequireGuest
 * Keeps authenticated therapists away from auth pages.
 * Redirects to /therapist/dashboard.
 */
function RequireGuest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (user)    return <Navigate to="/therapist/dashboard" replace />;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Auth Routes (Therapist) ────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login"
          element={<RequireGuest><LoginPage /></RequireGuest>}
        />
        <Route path="/register"
          element={<RequireGuest><RegisterPage /></RequireGuest>}
        />
      </Route>

      {/* ── Therapist Dashboard Routes ───────────────────────────────── */}
      <Route
        path="/therapist"
        element={<RequireTherapist><AppLayout /></RequireTherapist>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<Dashboard />} />
        <Route path="clients"           element={<Clients />} />
        <Route path="clients/:id"       element={<ClientDetail />} />
        <Route path="leads"             element={<LeadsPage />} />
        <Route path="schedule"          element={<Schedule />} />
        <Route path="notes"             element={<Notes />} />
        <Route path="payments"          element={<PaymentsPage />} />
        <Route path="analytics"         element={<Analytics />} />
        <Route path="settings"          element={<Settings />} />
      </Route>

      {/* ── Client Portal Routes ─────────────────────────────────────── */}
      <Route path="/client/:slug" element={<ClientPortalLayout />}>
        {/* Public pages */}
        <Route index              element={<ClientPortal />} />
        <Route path="booking"     element={<BookingPage />} />
        <Route path="intake"      element={<ClientIntakeConsent />} />
        <Route path="payment"     element={<Payment />} />

        {/* Auth pages for clients */}
        <Route path="login"        element={<ClientLoginPage />} />
        <Route path="set-password" element={<SetPasswordPage />} />

        {/* Protected client dashboard */}
        <Route path="portal"
          element={<RequireClient><ClientDashboard /></RequireClient>}
        />
      </Route>

      {/* ── Direct Branded Vanity Routes (e.g. /:slug and /:slug/booking) */}
      <Route path="/:slug" element={<ClientPortalLayout />}>
        <Route index              element={<ClientPortal />} />
        <Route path="booking"     element={<BookingPage />} />
        <Route path="intake"      element={<ClientIntakeConsent />} />
      </Route>

      {/* ── Backward Compatibility Redirects ─────────────────────────── */}
      <Route path="/dashboard"  element={<Navigate to="/therapist/dashboard"  replace />} />
      <Route path="/clients"    element={<Navigate to="/therapist/clients"    replace />} />
      <Route path="/leads"      element={<Navigate to="/therapist/leads"      replace />} />
      <Route path="/sessions"   element={<Navigate to="/therapist/schedule"   replace />} />
      <Route path="/notes"      element={<Navigate to="/therapist/notes"      replace />} />
      <Route path="/payments"   element={<Navigate to="/therapist/payments"   replace />} />

      {/* ── Default ──────────────────────────────────────────────────── */}
      <Route index element={<Navigate to="/therapist/dashboard" replace />} />
    </Routes>
  );
}
