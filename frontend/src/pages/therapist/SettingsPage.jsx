import { useEffect, useState } from 'react';
import {
  User, Briefcase, Lock, Save, Globe, Copy,
  CheckCircle, ExternalLink, ToggleLeft, ToggleRight,
  Eye, EyeOff,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import './SettingsPage.css';

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div className="settings-section-icon"><Icon size={17} /></div>
        <div>
          <h3 className="settings-section-title">{title}</h3>
          {subtitle && <p className="settings-section-sub">{subtitle}</p>}
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </div>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      {children}
      {hint && <p className="settings-hint">{hint}</p>}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, dispatch } = useAuth();

  /* Profile state */
  const [profile, setProfile] = useState({
    name:  '',
    phone: '',
    bio:   '',
    specializations: '',
    languages:       '',
    yearsOfExperience: '',
    licenseNumber:   '',
  });

  /* Branding state */
  const [branding, setBranding] = useState({
    practiceName:  '',
    slug:          '',
    brandColor:    '#6C63FF',
    isBookingOpen: true,
  });

  /* Password state */
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);

  /* UI */
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [slugTimer,  setSlugTimer]  = useState(null);
  const [busy,       setBusy]       = useState({ profile: false, branding: false, password: false });

  /* Seed form from user object */
  useEffect(() => {
    if (!user) return;
    setProfile({
      name:              user.name   || '',
      phone:             user.phone  || '',
      bio:               user.professionalDetails?.bio               || '',
      specializations:   (user.professionalDetails?.specializations  || []).join(', '),
      languages:         (user.professionalDetails?.languages         || []).join(', '),
      yearsOfExperience: user.professionalDetails?.yearsOfExperience || '',
      licenseNumber:     user.professionalDetails?.licenseNumber      || '',
    });
    setBranding({
      practiceName:  user.practiceName  || '',
      slug:          user.slug          || '',
      brandColor:    user.brandColor    || '#6C63FF',
      isBookingOpen: user.isBookingOpen !== false,
    });
  }, [user]);

  /* Slug availability check (debounced) */
  const handleSlugChange = (e) => {
    const val = e.target.value;
    setBranding((b) => ({ ...b, slug: val }));
    setSlugStatus(null);
    if (slugTimer) clearTimeout(slugTimer);
    if (!val || val === user?.slug) { setSlugStatus(null); return; }
    const timer = setTimeout(async () => {
      setSlugStatus('checking');
      try {
        const res = await api.get(`/auth/check-slug/${val}`);
        setSlugStatus(res.data.data.isAvailable ? 'available' : 'taken');
      } catch {
        setSlugStatus(null);
      }
    }, 600);
    setSlugTimer(timer);
  };

  /* Copy booking URL */
  const bookingUrl = `${window.location.origin}/client/${branding.slug}`;
  const copyUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking URL copied!');
  };

  /* Save profile */
  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy((b) => ({ ...b, profile: true }));
    try {
      const specializations = profile.specializations
        ? profile.specializations.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const languages = profile.languages
        ? profile.languages.split(',').map((l) => l.trim()).filter(Boolean)
        : [];

      const res = await api.patch('/auth/profile', {
        name:  profile.name,
        phone: profile.phone,
        professionalDetails: {
          bio:               profile.bio,
          specializations,
          languages,
          yearsOfExperience: profile.yearsOfExperience ? Number(profile.yearsOfExperience) : undefined,
          licenseNumber:     profile.licenseNumber || undefined,
        },
      });

      dispatch({ type: 'UPDATE_USER', payload: res.data.data });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setBusy((b) => ({ ...b, profile: false }));
    }
  };

  /* Save branding */
  const saveBranding = async (e) => {
    e.preventDefault();
    if (slugStatus === 'taken') {
      toast.error('Please choose a different workspace slug');
      return;
    }
    setBusy((b) => ({ ...b, branding: true }));
    try {
      const res = await api.patch('/auth/branding', {
        practiceName:  branding.practiceName,
        slug:          branding.slug,
        brandColor:    branding.brandColor,
        isBookingOpen: branding.isBookingOpen,
      });
      dispatch({ type: 'UPDATE_USER', payload: res.data.data });
      toast.success('Workspace settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update workspace');
    } finally {
      setBusy((b) => ({ ...b, branding: false }));
    }
  };

  /* Save password */
  const savePassword = async (e) => {
    e.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (password.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy((b) => ({ ...b, password: true }));
    try {
      await api.post('/auth/change-password', {
        currentPassword: password.currentPassword,
        newPassword:     password.newPassword,
      });
      toast.success('Password changed successfully!');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setBusy((b) => ({ ...b, password: false }));
    }
  };

  return (
    <div className="page settings-page">

      {/* ── Profile ─────────────────────────────────────────────── */}
      <form onSubmit={saveProfile}>
        <Section icon={User} title="Profile" subtitle="Your personal and professional information">
          <div className="settings-grid-2">
            <Field label="Full Name">
              <input
                className="modal-input"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Dr. Priya Sharma"
                required
              />
            </Field>
            <Field label="Phone Number">
              <input
                className="modal-input"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </Field>
          </div>

          <Field label="Bio / About Me" hint="Shown on your public booking page">
            <textarea
              className="modal-input"
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell clients about your approach, background, and what to expect from working with you…"
            />
          </Field>

          <div className="settings-grid-2">
            <Field label="Specializations" hint="Comma-separated (e.g. Anxiety, CBT, EMDR)">
              <input
                className="modal-input"
                value={profile.specializations}
                onChange={(e) => setProfile((p) => ({ ...p, specializations: e.target.value }))}
                placeholder="Anxiety, Depression, Trauma, CBT"
              />
            </Field>
            <Field label="Languages" hint="Comma-separated">
              <input
                className="modal-input"
                value={profile.languages}
                onChange={(e) => setProfile((p) => ({ ...p, languages: e.target.value }))}
                placeholder="English, Hindi, Tamil"
              />
            </Field>
            <Field label="Years of Experience">
              <input
                type="number"
                className="modal-input"
                min={0}
                value={profile.yearsOfExperience}
                onChange={(e) => setProfile((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                placeholder="8"
              />
            </Field>
            <Field label="License / Credential Number">
              <input
                className="modal-input"
                value={profile.licenseNumber}
                onChange={(e) => setProfile((p) => ({ ...p, licenseNumber: e.target.value }))}
                placeholder="RCI/MH/12345"
              />
            </Field>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={busy.profile}>
              <Save size={14} />
              {busy.profile ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </Section>
      </form>

      {/* ── Workspace / Branding ──────────────────────────────────── */}
      <form onSubmit={saveBranding}>
        <Section
          icon={Briefcase}
          title="Workspace"
          subtitle="Customize your practice branding and booking page"
        >
          <div className="settings-grid-2">
            <Field label="Practice Name">
              <input
                className="modal-input"
                value={branding.practiceName}
                onChange={(e) => setBranding((b) => ({ ...b, practiceName: e.target.value }))}
                placeholder="Serene Minds Therapy"
              />
            </Field>

            <Field
              label="Brand Color"
              hint="Used to theme your public booking page"
            >
              <div className="settings-color-row">
                <input
                  type="color"
                  className="settings-color-picker"
                  value={branding.brandColor}
                  onChange={(e) => setBranding((b) => ({ ...b, brandColor: e.target.value }))}
                />
                <input
                  className="modal-input"
                  value={branding.brandColor}
                  onChange={(e) => setBranding((b) => ({ ...b, brandColor: e.target.value }))}
                  placeholder="#6C63FF"
                  maxLength={7}
                />
              </div>
            </Field>
          </div>

          {/* Slug */}
          <Field
            label="Workspace Slug"
            hint={`Your booking page: ${bookingUrl}`}
          >
            <div className="settings-slug-row">
              <span className="settings-slug-prefix">/client/</span>
              <input
                className={`modal-input settings-slug-input ${
                  slugStatus === 'available' ? 'settings-slug-input--ok'
                  : slugStatus === 'taken'   ? 'settings-slug-input--err' : ''
                }`}
                value={branding.slug}
                onChange={handleSlugChange}
                placeholder="dr-priya"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
              {slugStatus === 'checking'  && <span className="slug-status slug-status--checking">Checking…</span>}
              {slugStatus === 'available' && <span className="slug-status slug-status--ok"><CheckCircle size={14}/> Available</span>}
              {slugStatus === 'taken'     && <span className="slug-status slug-status--err">Taken</span>}
            </div>
          </Field>

          {/* Booking URL preview */}
          <div className="settings-url-bar">
            <Globe size={13} className="settings-url-icon" />
            <span className="settings-url-text">{bookingUrl}</span>
            <button type="button" className="settings-url-btn" onClick={copyUrl} title="Copy URL">
              <Copy size={13} />
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="settings-url-btn"
              title="Open booking page"
            >
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Booking open toggle */}
          <div className="settings-toggle-row">
            <div>
              <p className="settings-toggle-label">Accept new bookings</p>
              <p className="settings-hint">When off, your booking page will show a "not accepting clients" message.</p>
            </div>
            <button
              type="button"
              className={`settings-toggle-btn ${branding.isBookingOpen ? 'settings-toggle-btn--on' : ''}`}
              onClick={() => setBranding((b) => ({ ...b, isBookingOpen: !b.isBookingOpen }))}
              aria-label="Toggle booking availability"
            >
              {branding.isBookingOpen
                ? <ToggleRight size={32} />
                : <ToggleLeft  size={32} />
              }
            </button>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={busy.branding || slugStatus === 'taken'}>
              <Save size={14} />
              {busy.branding ? 'Saving…' : 'Save Workspace'}
            </button>
          </div>
        </Section>
      </form>

      {/* ── Security ─────────────────────────────────────────────── */}
      <form onSubmit={savePassword}>
        <Section icon={Lock} title="Security" subtitle="Update your account password">
          <Field label="Current Password">
            <div className="settings-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="modal-input"
                value={password.currentPassword}
                onChange={(e) => setPassword((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                className="settings-pw-eye"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
          <div className="settings-grid-2">
            <Field label="New Password">
              <input
                type={showPw ? 'text' : 'password'}
                className="modal-input"
                value={password.newPassword}
                onChange={(e) => setPassword((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type={showPw ? 'text' : 'password'}
                className={`modal-input ${
                  password.confirmPassword && password.newPassword !== password.confirmPassword
                    ? 'settings-input--err' : ''
                }`}
                value={password.confirmPassword}
                onChange={(e) => setPassword((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
                minLength={8}
                required
              />
            </Field>
          </div>
          <div className="settings-actions">
            <button type="submit" className="btn-primary" disabled={busy.password}>
              <Lock size={14} />
              {busy.password ? 'Updating…' : 'Change Password'}
            </button>
          </div>
        </Section>
      </form>

      {/* ── Account info ──────────────────────────────────────────── */}
      <div className="settings-account-info">
        <span className="settings-label">Email (cannot be changed)</span>
        <span className="settings-email">{user?.email}</span>
        <span className="settings-tier-badge">
          {user?.subscriptionTier || 'free'} plan
        </span>
      </div>
    </div>
  );
}
