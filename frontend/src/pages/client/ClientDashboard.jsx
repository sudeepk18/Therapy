import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, User, Phone, LogOut,
  ChevronRight, BookOpen, Shield, Loader,
  MapPin, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { clientPortalApi } from '../../api/client.portal.api';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/common/Common';
import toast from 'react-hot-toast';
import './ClientDashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status) {
  const map = {
    completed:  { icon: <CheckCircle2 size={12} />, label: 'Completed',  cls: 'badge--done'      },
    cancelled:  { icon: <XCircle size={12} />,      label: 'Cancelled',  cls: 'badge--cancelled' },
    no_show:    { icon: <AlertCircle size={12} />,  label: 'No-show',    cls: 'badge--noshow'    },
    scheduled:  { icon: <Clock size={12} />,        label: 'Upcoming',   cls: 'badge--upcoming'  },
  };
  const s = map[status] || map.scheduled;
  return <span className={`cd-badge ${s.cls}`}>{s.icon}{s.label}</span>;
}

function mediumIcon(medium) {
  if (medium === 'video')     return <Video size={13} />;
  if (medium === 'in_person') return <MapPin size={13} />;
  if (medium === 'audio')     return <Phone size={13} />;
  return <Calendar size={13} />;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { slug }                  = useParams();
  const { user, userRole, logout } = useAuth();
  const navigate                  = useNavigate();

  const [profile,   setProfile]   = useState(null);
  const [sessions,  setSessions]  = useState({ upcoming: [], past: [] });
  const [therapist, setTherapist] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Redirect if not logged in as a client
  useEffect(() => {
    if (!user || userRole !== 'client') {
      navigate(`/client/${slug}/login`, { replace: true });
    }
  }, [user, userRole, slug, navigate]);

  useEffect(() => {
    if (!user || userRole !== 'client') return;

    const load = async () => {
      try {
        const [profileRes, sessionsRes, therapistRes] = await Promise.all([
          clientPortalApi.getMyProfile(),
          clientPortalApi.getMySessions(),
          clientPortalApi.getMyTherapist(),
        ]);
        setProfile(profileRes.data.data);
        setSessions(sessionsRes.data.data);
        setTherapist(therapistRes.data.data);
      } catch {
        toast.error('Could not load your portal. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, userRole]);

  const handleLogout = async () => {
    await logout();
    navigate(`/client/${slug}/login`);
  };

  if (loading) return <Spinner fullPage />;

  const brandColor = therapist?.brandColor || '#6C63FF';

  return (
    <div className="cd-root">
      {/* Top accent bar with brand color */}
      <div className="cd-topbar" style={{ background: brandColor }} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="cd-header">
        <div className="cd-header-inner">
          <div className="cd-header-brand">
            <div className="cd-avatar" style={{ background: `${brandColor}22`, border: `1.5px solid ${brandColor}55` }}>
              <User size={18} style={{ color: brandColor }} />
            </div>
            <div>
              <p className="cd-greeting">Welcome back</p>
              <h1 className="cd-name">{profile?.name || user?.name}</h1>
            </div>
          </div>

          <button className="cd-logout-btn" onClick={handleLogout} id="client-logout-btn">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="cd-main">

        {/* ── Stats row ──────────────────────────────────────────────── */}
        <div className="cd-stats-row">
          <div className="cd-stat-card">
            <div className="cd-stat-icon" style={{ background: `${brandColor}18` }}>
              <Calendar size={18} style={{ color: brandColor }} />
            </div>
            <div>
              <p className="cd-stat-num">{sessions.upcoming.length}</p>
              <p className="cd-stat-label">Upcoming</p>
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon" style={{ background: '#14b8a618' }}>
              <CheckCircle2 size={18} style={{ color: '#14b8a6' }} />
            </div>
            <div>
              <p className="cd-stat-num">{sessions.past.filter(s => s.status === 'completed').length}</p>
              <p className="cd-stat-label">Completed</p>
            </div>
          </div>
          <div className="cd-stat-card">
            <div className="cd-stat-icon" style={{ background: '#f59e0b18' }}>
              <BookOpen size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <p className="cd-stat-num">{sessions.past.length + sessions.upcoming.length}</p>
              <p className="cd-stat-label">Total Sessions</p>
            </div>
          </div>
        </div>

        {/* ── Upcoming sessions ──────────────────────────────────────── */}
        <section className="cd-section">
          <div className="cd-section-header">
            <h2 className="cd-section-title">
              <Calendar size={16} style={{ color: brandColor }} />
              Upcoming Sessions
            </h2>
            <Link to={`/client/${slug}/booking`} className="cd-book-btn" style={{ background: brandColor }} id="cd-book-session-btn">
              + Book Session
            </Link>
          </div>

          {sessions.upcoming.length === 0 ? (
            <div className="cd-empty">
              <Calendar size={28} color="#374151" />
              <p>No upcoming sessions scheduled.</p>
              <Link to={`/client/${slug}/booking`} className="cd-empty-cta" style={{ color: brandColor }}>
                Book your next session →
              </Link>
            </div>
          ) : (
            <div className="cd-sessions-list">
              {sessions.upcoming.map(s => (
                <div key={s._id} className="cd-session-card cd-session-card--upcoming">
                  <div className="cd-session-medium" style={{ background: `${brandColor}18`, color: brandColor }}>
                    {mediumIcon(s.medium)}
                  </div>
                  <div className="cd-session-info">
                    <p className="cd-session-date">{formatDate(s.scheduledAt)}</p>
                    <p className="cd-session-time">{formatTime(s.scheduledAt)}</p>
                    {s.durationMinutes && (
                      <p className="cd-session-meta">{s.durationMinutes} min · {s.medium || 'video'}</p>
                    )}
                  </div>
                  <div className="cd-session-right">
                    {statusBadge('scheduled')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Past sessions ──────────────────────────────────────────── */}
        {sessions.past.length > 0 && (
          <section className="cd-section">
            <div className="cd-section-header">
              <h2 className="cd-section-title">
                <Clock size={16} color="#6b7280" />
                Session History
              </h2>
            </div>
            <div className="cd-sessions-list">
              {sessions.past.map(s => (
                <div key={s._id} className="cd-session-card">
                  <div className="cd-session-medium" style={{ background: '#1f2937', color: '#6b7280' }}>
                    {mediumIcon(s.medium)}
                  </div>
                  <div className="cd-session-info">
                    <p className="cd-session-date">{formatDate(s.scheduledAt)}</p>
                    <p className="cd-session-time">{formatTime(s.scheduledAt)}</p>
                    {s.durationMinutes && (
                      <p className="cd-session-meta">{s.durationMinutes} min · {s.medium || 'video'}</p>
                    )}
                  </div>
                  <div className="cd-session-right">
                    {statusBadge(s.status)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Therapist card ─────────────────────────────────────────── */}
        {therapist && (
          <section className="cd-section">
            <div className="cd-section-header">
              <h2 className="cd-section-title">
                <User size={16} color="#6b7280" />
                Your Therapist
              </h2>
            </div>
            <div className="cd-therapist-card">
              <div className="cd-therapist-avatar" style={{ background: `${brandColor}22`, border: `2px solid ${brandColor}44` }}>
                {therapist.avatar
                  ? <img src={therapist.avatar} alt={therapist.name} />
                  : <User size={24} style={{ color: brandColor }} />
                }
              </div>
              <div className="cd-therapist-info">
                <h3 className="cd-therapist-name">{therapist.name}</h3>
                <p className="cd-therapist-practice">{therapist.practiceName}</p>
                {therapist.professionalDetails?.specializations?.length > 0 && (
                  <p className="cd-therapist-spec">
                    {therapist.professionalDetails.specializations.slice(0, 3).join(' · ')}
                  </p>
                )}
              </div>
              <Link
                to={`/client/${slug}`}
                className="cd-therapist-link"
                id="cd-view-profile-btn"
              >
                View profile <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        )}

        {/* ── Trust bar ──────────────────────────────────────────────── */}
        <div className="cd-trust-row">
          <span><Shield size={13} /> HIPAA Compliant</span>
          <span><Shield size={13} /> End-to-end encrypted</span>
          <span><Shield size={13} /> Confidential</span>
        </div>

      </main>
    </div>
  );
}
