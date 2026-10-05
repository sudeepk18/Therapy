import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { clientPortalApi } from '../../api/client.portal.api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './ClientLoginPage.css';

export default function SetPasswordPage() {
  const { slug }                = useParams();
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const { dispatch }            = useAuth();
  const token                   = searchParams.get('token');

  const [therapist, setTherapist] = useState(null);
  const [form, setForm]           = useState({ newPassword: '', confirm: '' });
  const [show, setShow]           = useState(false);
  const [busy, setBusy]           = useState(false);
  const [done, setDone]           = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!slug) return;
    clientPortalApi.getTherapistBySlug(slug)
      .then(res => setTherapist(res.data.data))
      .catch(() => {});
  }, [slug]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid invite link — token is missing.');
      return;
    }

    if (form.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    if (form.newPassword !== form.confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setBusy(true);
    setErrorMessage('');
    try {
      const res = await authApi.setClientPassword({ token, newPassword: form.newPassword });
      const { user, token: jwtToken, role } = res.data.data;

      // Log the client in via the context
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token: jwtToken, role },
      });

      setDone(true);
      toast.success('Password set! Redirecting to your portal…');

      setTimeout(() => navigate(`/client/${slug}/portal`), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const brandColor    = therapist?.brandColor || '#06B6D4';
  const practiceName  = therapist?.practiceName || therapist?.name || 'Your Therapist';

  if (!token) {
    return (
      <div className="cl-page">
        <div className="cl-accent-bar" style={{ background: brandColor }} />
        <div className="cl-card" style={{ textAlign: 'center' }}>
          <AlertCircle size={44} color="#F59E0B" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#F8FAFC', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>
            Invite Link Missing or Already Used
          </h2>
          <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            If you have already set up your password, you can sign in directly to your client portal without a new invite link.
          </p>
          <Link
            to={`/client/${slug}/login`}
            className="cl-btn"
            style={{
              background: `linear-gradient(135deg, ${brandColor}, #0891B2)`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            <LogIn size={16} /> Sign In to Client Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-page">
      <div className="cl-accent-bar" style={{ background: brandColor }} />

      <div className="cl-card">
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={48} style={{ color: brandColor, margin: '0 auto 16px' }} />
            <h2 style={{ color: '#f1f1f3', marginBottom: 8 }}>All set!</h2>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Taking you to your portal…
            </p>
          </div>
        ) : (
          <>
            <div className="cl-brand">
              <div className="cl-brand-icon" style={{ background: `${brandColor}22`, border: `1.5px solid ${brandColor}44` }}>
                <Lock size={20} style={{ color: brandColor }} />
              </div>
              <div>
                <p className="cl-brand-label">Client Portal</p>
                <h1 className="cl-brand-name">{practiceName}</h1>
              </div>
            </div>

            <p className="cl-subheading">
              Set a password to activate your portal account.
            </p>

            {errorMessage && errorMessage.toLowerCase().includes('expired') && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#F59E0B',
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Already set your password before?</p>
                <p style={{ margin: '0 0 10px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  If you previously created a password, you can sign in directly:
                </p>
                <Link
                  to={`/client/${slug}/login`}
                  style={{
                    color: brandColor,
                    fontWeight: 600,
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <LogIn size={13} /> Go to Client Sign In →
                </Link>
              </div>
            )}

            <form className="cl-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="sp-password" className="auth-label">New password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="sp-password"
                    type={show ? 'text' : 'password'}
                    name="newPassword"
                    className="auth-input auth-input--pass"
                    placeholder="Min 8 characters"
                    value={form.newPassword}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label="Toggle visibility">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="sp-confirm" className="auth-label">Confirm password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="sp-confirm"
                    type={show ? 'text' : 'password'}
                    name="confirm"
                    className="auth-input"
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button
                id="set-password-submit"
                type="submit"
                className="cl-btn"
                style={{ background: brandColor }}
                disabled={busy}
              >
                {busy ? <Loader size={16} className="spin-icon" /> : 'Activate My Account'}
              </button>
            </form>

            <p className="cl-footer-note" style={{ marginTop: 20 }}>
              Already created your password previously?{' '}
              <Link to={`/client/${slug}/login`} style={{ color: brandColor, fontWeight: 600 }}>
                Sign In directly →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
