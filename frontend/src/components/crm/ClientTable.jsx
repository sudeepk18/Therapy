import { Link } from 'react-router-dom';
import { User, Phone, Mail, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const TAG_COLORS = {
  low_risk:      { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Low Risk' },
  moderate_risk: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Moderate Risk' },
  high_risk:     { color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'High Risk' },
  vip:           { color: 'var(--violet)',  bg: 'var(--violet-glow)', label: 'VIP' },
  new:           { color: 'var(--teal)',    bg: 'var(--teal-glow)',   label: 'New' },
  none:          { color: 'var(--text-muted)', bg: 'transparent',    label: 'None' },
};

const STATUS_COLORS = {
  active:     { color: 'var(--success)', bg: 'var(--success-bg)' },
  inactive:   { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  on_hold:    { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  discharged: { color: 'var(--danger)',  bg: 'var(--danger-bg)' },
  waitlist:   { color: 'var(--violet)',  bg: 'var(--violet-glow)' },
};

export default function ClientTable({ clients = [], loading = false }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>Risk Tag</th>
              <th>Intake &amp; Consent</th>
              <th>Onboarded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 16, borderRadius: 4, width: 80 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="table-empty">
        <User size={32} />
        <p>No clients found matching criteria</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Status</th>
            <th>Clinical Tag</th>
            <th>Intake &amp; Consent</th>
            <th>Onboarded</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => {
            const initials = c.name
              ? c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
              : 'CL';
            const tagCfg = TAG_COLORS[c.tag] || TAG_COLORS.none;
            const statusCfg = STATUS_COLORS[c.status] || STATUS_COLORS.active;
            const isConsentGiven = c.consent?.isConsentAccepted;
            const hasIntake = Boolean(c.intake?.presentingConcerns);

            return (
              <tr key={c._id} className="table-row-hover">
                <td>
                  <div className="client-name-cell">
                    <div className="table-avatar">{initials}</div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ color: statusCfg.color, background: statusCfg.bg }}
                  >
                    {c.status?.replace('_', ' ') || 'active'}
                  </span>
                </td>
                <td>
                  {c.tag && c.tag !== 'none' ? (
                    <span
                      className="status-badge"
                      style={{ color: tagCfg.color, background: tagCfg.bg }}
                    >
                      {tagCfg.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: hasIntake ? 'var(--teal-glow)' : 'var(--bg-elevated)',
                      color: hasIntake ? 'var(--teal)' : 'var(--text-muted)',
                      fontWeight: 500,
                    }}>
                      <FileText size={11} /> Intake
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isConsentGiven ? 'var(--success-bg)' : 'var(--bg-elevated)',
                      color: isConsentGiven ? 'var(--success)' : 'var(--text-muted)',
                      fontWeight: 500,
                    }}>
                      {isConsentGiven ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {isConsentGiven ? 'Consented' : 'Pending'}
                    </span>
                  </div>
                </td>
                <td className="text-secondary" style={{ fontSize: 12 }}>
                  {c.createdAt
                    ? format(new Date(c.createdAt), 'dd MMM yyyy')
                    : '—'}
                </td>
                <td>
                  <Link to={`/therapist/clients/${c._id}`} className="table-action">
                    View Record
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
