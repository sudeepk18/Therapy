import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import './DashboardWidgets.css';

const STATUS_COLORS = {
  scheduled:   { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  completed:   { color: 'var(--success)', bg: 'var(--success-bg)' },
  'in-progress':{ color: 'var(--teal)',   bg: 'var(--teal-glow)'  },
  cancelled:   { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  'no-show':   { color: 'var(--warning)', bg: 'var(--warning-bg)' },
};

export default function UpcomingSessions({ sessions, loading }) {
  if (loading) {
    return (
      <div className="widget-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="widget-row">
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="skeleton" style={{ height: 13, width: '60%' }} />
              <div className="skeleton" style={{ height: 11, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="widget-empty">
        <Calendar size={28} />
        <p>No sessions yet</p>
      </div>
    );
  }

  return (
    <div className="widget-list">
      {sessions.slice(0, 6).map((s) => {
        const st = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
        return (
          <div key={s._id} className="widget-row">
            <div className="widget-date-block" style={{ background: st.bg }}>
              <span className="widget-day" style={{ color: st.color }}>
                {format(new Date(s.scheduledAt), 'd')}
              </span>
              <span className="widget-month" style={{ color: st.color }}>
                {format(new Date(s.scheduledAt), 'MMM')}
              </span>
            </div>
            <div className="widget-row-info">
              <p className="widget-row-title">
                {s.clientId?.name || 'Client'}
              </p>
              <p className="widget-row-sub">
                {format(new Date(s.scheduledAt), 'h:mm a')} · {s.medium || 'in-person'}
              </p>
            </div>
            <span className="widget-badge" style={{ color: st.color, background: st.bg }}>
              {s.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
