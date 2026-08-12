import './StatCard.css';

const COLOR_MAP = {
  teal:    { icon: 'var(--teal)',    bg: 'var(--teal-glow)'    },
  violet:  { icon: 'var(--violet)', bg: 'var(--violet-glow)'  },
  success: { icon: 'var(--success)',bg: 'var(--success-bg)'   },
  warning: { icon: 'var(--warning)',bg: 'var(--warning-bg)'   },
  danger:  { icon: 'var(--danger)', bg: 'var(--danger-bg)'    },
};

export default function StatCard({ id, label, value, icon: Icon, color = 'teal', trend, loading }) {
  const colors = COLOR_MAP[color] || COLOR_MAP.teal;

  if (loading) {
    return (
      <div className="stat-card" id={id}>
        <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 32, width: '65%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '40%' }} />
      </div>
    );
  }

  return (
    <div className="stat-card" id={id}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-wrap" style={{ background: colors.bg }}>
          <Icon size={16} style={{ color: colors.icon }} />
        </div>
      </div>
      <p className="stat-value">{value}</p>
      {trend && <p className="stat-trend">{trend}</p>}
    </div>
  );
}
