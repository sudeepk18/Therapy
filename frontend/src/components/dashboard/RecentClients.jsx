import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import './DashboardWidgets.css';

const STATUS_BADGE = {
  active:     { color: 'var(--success)', bg: 'var(--success-bg)' },
  inactive:   { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  discharged: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
};

export default function RecentClients({ clients, loading }) {
  if (loading) {
    return (
      <div className="widget-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="widget-row">
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="skeleton" style={{ height: 13, width: '45%' }} />
              <div className="skeleton" style={{ height: 11, width: '30%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!clients.length) {
    return (
      <div className="widget-empty">
        <Users size={28} />
        <p>No clients yet — <Link to="/clients" style={{ color: 'var(--teal)' }}>add one</Link></p>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {clients.map((c) => {
        const st = STATUS_BADGE[c.status] || STATUS_BADGE.active;
        const initials = c.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        return (
          <Link to={`/clients/${c._id}`} key={c._id} className="widget-row widget-row--link">
            <div className="widget-avatar">{initials}</div>
            <div className="widget-row-info">
              <p className="widget-row-title">{c.name}</p>
              <p className="widget-row-sub">{c.email}</p>
            </div>
            <span className="widget-badge" style={{ color: st.color, background: st.bg }}>
              {c.status}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
