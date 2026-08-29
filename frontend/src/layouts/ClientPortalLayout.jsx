import { Outlet, Link, useParams } from 'react-router-dom';
import './ClientPortalLayout.css';

/**
 * ClientPortalLayout
 * Minimal public layout wrapping all /client/:slug/* routes.
 * Does NOT use the therapist AppLayout, sidebar, or header.
 * Fully accessible without authentication.
 */
export default function ClientPortalLayout() {
  const { slug } = useParams();

  return (
    <div className="cp-layout">
      {/* Minimal public nav */}
      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-brand">
            <div className="cp-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#14B8A6" />
                <path d="M2 17l10 5 10-5" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12l10 5 10-5" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="cp-brand-name">Unfazed</span>
          </div>

          <nav className="cp-nav">
            <Link to={`/client/${slug}`} className="cp-nav-link">Home</Link>
            <Link to={`/client/${slug}/booking`} className="cp-nav-link cp-nav-link--cta">
              Book Session
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
