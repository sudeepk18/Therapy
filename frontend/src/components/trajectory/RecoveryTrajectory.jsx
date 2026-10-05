import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Activity,
  Loader, BarChart3, AlertCircle,
} from 'lucide-react';
import { trajectoryApi } from '../../api/trajectory.api';
import './RecoveryTrajectory.css';

function DirectionBadge({ direction, improvement }) {
  const config = {
    improving: { icon: <TrendingUp size={13} />, color: '#14b8a6', bg: '#f0fdfa', label: 'Improving' },
    stable:    { icon: <Minus size={13} />,       color: '#f59e0b', bg: '#fffbeb', label: 'Stable' },
    declining: { icon: <TrendingDown size={13} />, color: '#ef4444', bg: '#fef2f2', label: 'Needs Attention' },
    insufficient_data: { icon: <AlertCircle size={13} />, color: '#94a3b8', bg: '#f8fafc', label: 'Insufficient Data' },
  };
  const c = config[direction] || config.insufficient_data;

  return (
    <div className="rt-direction-badge" style={{ background: c.bg, color: c.color }}>
      {c.icon}
      <span>{c.label}</span>
      {improvement !== 0 && direction !== 'insufficient_data' && (
        <span className="rt-improvement">
          ({improvement > 0 ? '+' : ''}{improvement}%)
        </span>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rt-tooltip">
      <p className="rt-tooltip-date">{d.session_date}</p>
      <p><strong>Valence:</strong> {d.valence_score?.toFixed(3)}</p>
      <p><strong>Moving Avg:</strong> {d.moving_average?.toFixed(3)}</p>
      <p><strong>Hopefulness:</strong> {d.hopefulness_index?.toFixed(1)}%</p>
    </div>
  );
}

export default function RecoveryTrajectory({ clientId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!clientId) return;
    const fetch = async () => {
      try {
        const res = await trajectoryApi.getTrajectory(clientId);
        setData(res.data?.data?.trajectory || null);
      } catch {
        setError('Could not load trajectory data.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [clientId]);

  if (loading) {
    return (
      <div className="rt-card rt-loading">
        <Loader size={18} className="spin" />
        <span>Computing recovery trajectory...</span>
      </div>
    );
  }

  if (error || !data || !data.trend_points?.length) {
    return (
      <div className="rt-card rt-empty">
        <BarChart3 size={28} className="rt-empty-icon" />
        <h4>Recovery Trajectory</h4>
        <p>
          {error || 'No sentiment data available yet. Analyze session notes to build the trajectory graph.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rt-card">
      <div className="rt-header">
        <div className="rt-header-left">
          <div className="rt-icon-wrap">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="rt-title">Recovery Trajectory</h3>
            <p className="rt-subtitle">
              {data.sessions_analyzed} sessions analyzed · Avg valence: {data.avg_valence?.toFixed(3)}
            </p>
          </div>
        </div>
        <DirectionBadge direction={data.overall_direction} improvement={data.improvement_pct} />
      </div>

      {/* Chart */}
      <div className="rt-chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.trend_points} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="hopefulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" />
            <XAxis
              dataKey="session_date"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Hopefulness %', angle: -90, position: 'insideLeft', offset: 20, style: { fontSize: 11, fill: '#94a3b8' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="hopefulness_index"
              stroke="#14b8a6"
              strokeWidth={2.5}
              fill="url(#hopefulGrad)"
              dot={{ r: 4, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="moving_average"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="3-Session Avg"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="rt-legend">
        <span className="rt-legend-item">
          <span className="rt-legend-dot" style={{ background: '#14b8a6' }} />
          Hopefulness Index
        </span>
        <span className="rt-legend-item">
          <span className="rt-legend-line" style={{ borderColor: '#8b5cf6' }} />
          Moving Average
        </span>
      </div>
    </div>
  );
}
