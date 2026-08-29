import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clientPortalApi } from '../../api/client.portal.api';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './ClientLoginPage.css';

export default function ClientLoginPage() {
  const { clientLogin, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { slug }  = useParams();

  const [therapist, setTherapist] = useState(null);
  const [form, setForm]           = useState({ email: '', password: '' });
  const [show, setShow]           = useState(false);
  const [busy, setBusy]           = useState(false);

  // Fetch therapist branding for the login page
  useEffect(() => {
    if (!slug) return;
    clientPortalApi.getTherapistBySlug(slug)
      .then(res => setTherapist(res.data.data))
      .catch(() => {/* non-critical, proceed without branding */});
  }, [slug]);

  // If already logged in as client, go straight to portal
  useEffect(() => {
    if (user && userRole === 'client') {
      navigate(`/client/${slug}/portal`, { replace: true });
    }
  }, [user, userRole, slug, navigate]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await clientLogin(form.email, form.password);
    setBusy(false);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(`/client/${slug}/portal`);
    } else {
      toast.error(result.message);
    }
  };

  const brandColor = therapist?.brandColor || '#6C63FF';
  const practiceName = therapist?.practiceName || therapist?.name || 'Your Therapist';

  return (
    <div className="cl-page">
      {/* Branded accent bar */}
      <div className="cl-accent-bar" style={{ background: brandColor }} />

      <div className="cl-card">
        {/* Practice branding */}
        <div className="cl-brand">
          <div className="cl-brand-icon" style={{ background: `${brandColor}22`, border: `1.5px solid ${brandColor}44` }}>
            <ShieldCheck size={22} style={{ color: brandColor }} />
          </div>
          <div>
            <p className="cl-brand-label">Client Portal</p>
            <h1 className="cl-brand-name">{practiceName}</h1>
          </div>
        </div>

        <p className="cl-subheading">Sign in to access your sessions &amp; documents</p>

        <form className="cl-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="cl-email" className="auth-label">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="cl-email"
                type="email"
                name="email"
                className="auth-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="cl-password" className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="cl-password"
                type={show ? 'text' : 'password'}
                name="password"
                className="auth-input auth-input--pass"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label="Toggle password visibility">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            id="client-login-submit"
            type="submit"
            className="cl-btn"
            style={{ background: brandColor }}
            disabled={busy}
          >
            {busy ? <Loader size={16} className="spin-icon" /> : 'Sign in to Portal'}
          </button>
        </form>

        <p className="cl-footer-note">
          First time here?{' '}
          <span>Use the invite link sent by your therapist to set your password.</span>
        </p>

        <Link to={`/client/${slug}`} className="cl-back-link">
          ← Back to therapist profile
        </Link>
      </div>
    </div>
  );
}
