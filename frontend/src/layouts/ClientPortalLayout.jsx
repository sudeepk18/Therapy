import { Outlet, Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogIn, CalendarPlus } from 'lucide-react';
import './ClientPortalLayout.css';

/**
 * ClientPortalLayout
 * Minimal public layout wrapping all /client/:slug/* routes.
 * Accessible to clients and public visitors.
 */
export default function ClientPortalLayout() {
  const { slug } = useParams();
  const { user, userRole } = useAuth();
  const isClientLoggedIn = user && userRole === 'client';

  return (
    <div className="cp-layout">
      {/* Minimal public nav */}
      <header className="cp-header">
        <div className="cp-header-inner">
          <Link to={`/client/${slug}`} className="cp-brand">
            <div className="cp-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#06B6D4" />
                <path d="M2 17l10 5 10-5" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12l10 5 10-5" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="cp-brand-name">Unfazed</span>
          </Link>

          <nav className="cp-nav">
            <Link to={`/client/${slug}`} className="cp-nav-link">Home</Link>
            
            {isClientLoggedIn ? (
              <Link to={`/client/${slug}/portal`} className="cp-nav-link cp-nav-link--portal">
                <User size={14} /> My Portal
              </Link>
            ) : (
              <Link to={`/client/${slug}/login`} className="cp-nav-link cp-nav-link--login">
                <LogIn size={14} /> Sign In
              </Link>
            )}

            <Link to={`/client/${slug}/booking`} className="cp-nav-link cp-nav-link--cta">
              <CalendarPlus size={14} /> Book Session
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="cp-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="cp-footer">
        <p>Powered by <span className="cp-footer-brand">Unfazed</span> · Secure &amp; Confidential</p>
      </footer>
    </div>
  );
}
