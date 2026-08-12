import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import AppLayout   from './layouts/AppLayout';
import AuthLayout  from './layouts/AuthLayout';

// Auth pages
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientsPage   from './pages/clients/ClientsPage';
import ClientDetail  from './pages/clients/ClientDetailPage';
import LeadsPage     from './pages/leads/LeadsPage';
import SessionsPage  from './pages/sessions/SessionsPage';
import NotesPage     from './pages/notes/NotesPage';
import PaymentsPage  from './pages/payments/PaymentsPage';

/** Route guard — redirects unauthenticated users to /login */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

/** Route guard — redirects authenticated users away from auth pages */
function RequireGuest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
}

function FullPageSpinner() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--teal)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login"    element={<RequireGuest><LoginPage /></RequireGuest>} />
            <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />
          </Route>

          {/* Protected dashboard routes */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index                   element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"       element={<DashboardPage />} />
            <Route path="/clients"         element={<ClientsPage />} />
            <Route path="/clients/:id"     element={<ClientDetail />} />
            <Route path="/leads"           element={<LeadsPage />} />
            <Route path="/sessions"        element={<SessionsPage />} />
            <Route path="/notes"           element={<NotesPage />} />
            <Route path="/payments"        element={<PaymentsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
