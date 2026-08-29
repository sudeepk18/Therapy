import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';

/**
 * App.jsx
 * Root component — provides AuthContext and BrowserRouter,
 * then delegates all routing to AppRoutes.
 *
 * Route tree lives in src/routes/AppRoutes.jsx.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
