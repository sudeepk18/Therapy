import { TrendingUp, ArrowUpRight } from 'lucide-react';
import './StatCard.css';

const COLOR_MAP = {
  teal:    { icon: '#06B6D4', bg: 'rgba(6, 182, 212, 0.14)', glow: 'rgba(6, 182, 212, 0.3)', border: 'rgba(6, 182, 212, 0.25)' },
  violet:  { icon: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.14)', glow: 'rgba(139, 92, 246, 0.3)', border: 'rgba(139, 92, 246, 0.25)' },
  success: { icon: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', glow: 'rgba(16, 185, 129, 0.3)', border: 'rgba(16, 185, 129, 0.25)' },
  warning: { icon: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', glow: 'rgba(245, 158, 11, 0.3)', border: 'rgba(245, 158, 11, 0.25)' },
  danger:  { icon: '#F43F5E', bg: 'rgba(244, 63, 94, 0.14)', glow: 'rgba(244, 63, 94, 0.3)', border: 'rgba(244, 63, 94, 0.25)' },
};

export default function StatCard({ id, label, value, icon: Icon, color = 'teal', trend, loading }) {
  const conf = COLOR_MAP[color] || COLOR_MAP.teal;

  if (loading) {
    return (
      <div className="stat-card" id={id}>
        <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 36, width: '60%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 14, width: '50%' }} />
      </div>
    );
  }

  return (
    <div className={`stat-card stat-card--${color}`} id={id}>
      <div className="stat-card-glow" aria-hidden="true" />
      <div className="stat-card-top-bar" aria-hidden="true" />

      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-wrap" style={{ background: conf.bg, borderColor: conf.border }}>
          <Icon size={18} style={{ color: conf.icon }} />
        </div>
      </div>

      <div className="stat-middle">
        <p className="stat-value">{value}</p>
      </div>

      {trend && (
        <div className="stat-bottom">
          <span className="stat-trend-badge">
            <ArrowUpRight size={12} className="stat-trend-icon" />
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
