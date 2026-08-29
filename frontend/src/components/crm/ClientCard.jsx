import { Link } from 'react-router-dom';
import { Mail, Phone, Calendar, ShieldCheck, ChevronRight } from 'lucide-react';

const TAG_CONFIG = {
  low_risk:      { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Low Risk' },
  moderate_risk: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Moderate Risk' },
  high_risk:     { color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'High Risk' },
  vip:           { color: 'var(--violet)',  bg: 'var(--violet-glow)', label: 'VIP' },
  new:           { color: 'var(--teal)',    bg: 'var(--teal-glow)',   label: 'New' },
  none:          { color: 'var(--text-muted)', bg: 'transparent',    label: '' },
};

export default function ClientCard({ client }) {
  if (!client) return null;

  const initials = client.name
    ? client.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CL';

  const tag = TAG_CONFIG[client.tag] || TAG_CONFIG.none;
  const isConsentGiven = client.consent?.isConsentAccepted;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 16,
      transition: 'var(--transition)',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="table-avatar" style={{ width: 42, height: 42, fontSize: 14 }}>
              {initials}
            </div>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{client.name}</h4>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client.gender || 'Client'}</span>
            </div>
          </div>
          {client.tag && client.tag !== 'none' && (
            <span className="status-badge" style={{ color: tag.color, background: tag.bg }}>
              {tag.label}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} color="var(--text-muted)" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={13} color="var(--text-muted)" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isConsentGiven ? 'var(--success)' : 'var(--text-muted)' }}>
          <ShieldCheck size={14} />
          <span>{isConsentGiven ? 'Consent on file' : 'Pending consent'}</span>
        </div>
        <Link
          to={`/therapist/clients/${client._id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--teal)',
          }}
        >
          View <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
