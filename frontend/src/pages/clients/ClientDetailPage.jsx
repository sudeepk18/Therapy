import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, Tag, Users,
  FileText, ShieldCheck, HeartPulse, AlertCircle,
  Clock, CheckCircle2, UserX, Send, Copy, X, ExternalLink,
} from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import { sessionsApi } from '../../api/sessions.api';
import { authApi } from '../../api/auth.api';
import api from '../../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import './ClientDetail.css';

const TAG_CONFIG = {
  low_risk:      { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Low Risk' },
  moderate_risk: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Moderate Risk' },
  high_risk:     { color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'High Risk' },
  vip:           { color: 'var(--violet)',  bg: 'var(--violet-glow)', label: 'VIP' },
  new:           { color: 'var(--teal)',    bg: 'var(--teal-glow)',   label: 'New Client' },
  none:          { color: 'var(--text-muted)', bg: 'transparent',    label: 'None' },
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('overview'); // 'overview' | 'intake' | 'consent' | 'sessions'
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [discharging, setDischarging] = useState(false);

  // Portal invite state
  const [inviting,    setInviting]    = useState(false);
  const [inviteLink,  setInviteLink]  = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/clients/${id}/profile`);
      setProfileData(res.data.data);
    } catch {
      // Fallback to basic getById if profile aggregator fails
      try {
        const [c, s] = await Promise.all([
          clientsApi.getById(id),
          sessionsApi.list({ clientId: id, limit: 20 }),
        ]);
        setProfileData({
          client: c.data.data?.client || c.data.data,
          intake: c.data.data?.client?.intake || c.data.data?.intake,
          consent: c.data.data?.client?.consent || c.data.data?.consent,
          sessions: s.data.data.sessions || [],
          stats: c.data.data?.stats || {},
        });
      } catch {
        toast.error('Failed to load client details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleDischarge = async (e) => {
    e.preventDefault();
    setDischarging(true);
    try {
      await api.post(`/clients/${id}/discharge`, { notes: dischargeNotes });
      toast.success('Client discharged successfully');
      setShowDischargeModal(false);
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discharge client');
    } finally {
      setDischarging(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const res = await authApi.inviteClient(id);
      setInviteLink(res.data.data.inviteUrl);
      setShowInviteModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invite link');
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied!');
    }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading client record…</div>;
  if (!profileData?.client) return <div style={{ padding: 40, color: 'var(--danger)' }}>Client not found.</div>;

  const { client, intake, consent, sessions, stats } = profileData;
  const initials = client.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const tagCfg = TAG_CONFIG[client.tag] || TAG_CONFIG.none;
  const isConsentGiven = consent?.isConsentAccepted;

  return (
    <div className="page">
      <Link to="/therapist/clients" className="back-link">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      {/* Profile Header Card */}
      <div className="client-detail-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="client-detail-avatar">{initials}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 className="client-detail-name" style={{ margin: 0 }}>{client.name}</h2>
              {client.tag && client.tag !== 'none' && (
                <span className="status-badge" style={{ color: tagCfg.color, background: tagCfg.bg }}>
                  {tagCfg.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <span className="status-badge" style={{
                color: client.status === 'active' ? 'var(--success)' : client.status === 'discharged' ? 'var(--danger)' : 'var(--warning)',
                background: client.status === 'active' ? 'var(--success-bg)' : client.status === 'discharged' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              }}>
                {client.status?.replace('_', ' ') || 'active'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>• {client.email}</span>
            </div>
          </div>
        </div>

        {client.status !== 'discharged' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              id="send-portal-invite-btn"
              type="button"
              className="btn-secondary"
              onClick={handleInvite}
              disabled={inviting}
              style={{ color: 'var(--teal)' }}
            >
              <Send size={14} />
              {inviting ? 'Generating…' : client.hasPortalAccess ? 'Re-send Invite' : 'Send Portal Invite'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowDischargeModal(true)}
              style={{ color: 'var(--danger)' }}
            >
              <UserX size={14} /> Discharge Client
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {[
          { id: 'overview', label: 'Overview', icon: Users },
          { id: 'intake', label: 'Clinical Intake', icon: FileText },
          { id: 'consent', label: 'Digital Consent', icon: ShieldCheck },
          { id: 'sessions', label: `Sessions (${sessions.length})`, icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: isActive ? 'var(--teal-glow)' : 'transparent',
                color: isActive ? 'var(--teal)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="detail-grid">
            <InfoCard icon={Mail} label="Email Address" value={client.email} />
            <InfoCard icon={Phone} label="Phone Number" value={client.phone || '—'} />
            <InfoCard
              icon={Calendar}
              label="Date of Birth"
              value={client.dateOfBirth ? `${format(new Date(client.dateOfBirth), 'dd MMM yyyy')} (${client.age || ''} yrs)` : '—'}
            />
            <InfoCard icon={Users} label="Gender Identity" value={client.gender || '—'} />
            <InfoCard icon={Clock} label="Total Sessions" value={stats?.totalSessions || sessions.length} />
            <InfoCard icon={CheckCircle2} label="Completed Sessions" value={stats?.completedCount || 0} />
          </div>

          {/* Emergency Contact */}
          <div className="table-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartPulse size={16} color="var(--danger)" /> Emergency Contact
            </h3>
            {client.emergencyContact?.name ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 13 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <strong style={{ color: 'var(--text-primary)' }}>{client.emergencyContact.name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Relationship:</span> <strong style={{ color: 'var(--text-primary)' }}>{client.emergencyContact.relationship || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong style={{ color: 'var(--text-primary)' }}>{client.emergencyContact.phone || '—'}</strong></div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No emergency contact recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Clinical Intake */}
      {activeTab === 'intake' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="table-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
              Intake Assessment &amp; Clinical Goals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presenting Concerns</label>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  {intake?.presentingConcerns || 'No presenting concerns documented yet.'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Therapy Goals</label>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4, background: 'var(--bg-elevated)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  {intake?.goals || 'No specific goals set yet.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Medical / Psychiatric History</label>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4, background: 'var(--bg-elevated)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                    {intake?.medicalHistory || 'None noted.'}
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Medications</label>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4, background: 'var(--bg-elevated)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                    {intake?.currentMedications?.length ? intake.currentMedications.join(', ') : 'None reported.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Digital Consent */}
      {activeTab === 'consent' && (
        <div className="table-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isConsentGiven ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: isConsentGiven ? 'var(--success)' : 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isConsentGiven ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {isConsentGiven ? 'Informed Consent on File' : 'Consent Pending'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isConsentGiven
                  ? `Signed electronically on ${format(new Date(consent.consentAcceptedAt), 'dd MMMM yyyy, h:mm a')}`
                  : 'Client has not yet completed digital consent terms.'}
              </p>
            </div>
          </div>

          {isConsentGiven && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Digital Signature</span>
                <strong style={{ color: 'var(--teal)', fontSize: 15, fontFamily: 'cursive' }}>{consent.consentSignatureName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Document Version</span>
                <strong style={{ color: 'var(--text-primary)' }}>v{consent.consentVersion || '1.0'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, textTransform: 'uppercase' }}>Auditable IP</span>
                <span style={{ color: 'var(--text-secondary)' }}>{consent.consentIp || 'Recorded'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Sessions */}
      {activeTab === 'sessions' && (
        <div className="table-card">
          <div className="table-meta">
            <p className="table-count">All Sessions ({sessions.length})</p>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Medium</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="table-empty">
                        <Calendar size={28} />
                        <p>No sessions recorded yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s._id} className="table-row-hover">
                      <td>{format(new Date(s.scheduledAt), 'dd MMM yyyy, h:mm a')}</td>
                      <td className="text-secondary">{s.sessionType || 'individual'}</td>
                      <td className="text-secondary">{s.medium || 'video'}</td>
                      <td className="text-secondary">{s.durationMinutes || 50} mins</td>
                      <td>
                        <span className="status-badge" style={{
                          color: s.status === 'completed' ? 'var(--success)' : s.status === 'scheduled' ? 'var(--info)' : 'var(--warning)',
                          background: s.status === 'completed' ? 'var(--success-bg)' : s.status === 'scheduled' ? 'var(--info-bg)' : 'var(--warning-bg)',
                        }}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Discharge Client from Care</h3>
            <form onSubmit={handleDischarge} className="modal-form">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Discharging will mark <strong>{client.name}</strong> as discharged from active psychotherapy.
              </p>
              <label>
                Discharge Summary &amp; Recommendations
                <textarea
                  className="modal-input"
                  rows={3}
                  placeholder="Reason for discharge, treatment goals achieved, future recommendations..."
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                />
              </label>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowDischargeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--danger)' }} disabled={discharging}>
                  {discharging ? 'Discharging…' : 'Confirm Discharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portal Invite Modal */}
      {showInviteModal && inviteLink && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="modal-title" style={{ color: 'var(--teal)', margin: 0 }}>
                Portal Invite Link
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              Share this link with <strong>{client.name}</strong> so they can set their password and access their client portal.
              The link expires in <strong>72 hours</strong>.
            </p>

            <div style={{
              background: '#111117',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <code style={{ flex: 1, fontSize: 11.5, color: 'var(--text-secondary)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {inviteLink}
              </code>
              <button
                id="copy-invite-link-btn"
                type="button"
                onClick={copyInviteLink}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'var(--teal-glow)', color: 'var(--teal)',
                  border: '1px solid var(--teal)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              💡 Email sending is not yet configured — copy this link and send it to {client.name} via WhatsApp or email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="info-card">
      <div className="info-card-icon"><Icon size={14} /></div>
      <div>
        <p className="info-card-label">{label}</p>
        <p className="info-card-value">{value}</p>
      </div>
    </div>
  );
}
