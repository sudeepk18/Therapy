import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';
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
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const brandColor    = therapist?.brandColor || '#6C63FF';
  const practiceName  = therapist?.practiceName || therapist?.name || 'Your Therapist';

  if (!token) {
    return (
      <div className="cl-page">
        <div className="cl-accent-bar" style={{ background: brandColor }} />
        <div className="cl-card" style={{ textAlign: 'center' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#f1f1f3', marginBottom: 8 }}>Invalid Link</h2>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>
            This invite link is missing a token. Please ask your therapist to send a new invite.
          </p>
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
          </>
        )}
      </div>
    </div>
  );
}
