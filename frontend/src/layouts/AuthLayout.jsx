import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      {/* Ambient glow orbs */}
      <div className="auth-orb auth-orb--teal"   aria-hidden="true" />
      <div className="auth-orb auth-orb--violet"  aria-hidden="true" />

      <div className="auth-card">
        {/* Brand mark */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--teal)" />
              <path d="M2 17l10 5 10-5" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
              <path d="M2 12l10 5 10-5" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="auth-brand-name">Unfazed</span>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
