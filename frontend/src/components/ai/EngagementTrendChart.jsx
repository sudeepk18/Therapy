/**
 * EngagementTrendChart.jsx
 * Mini line chart showing client's sentiment scores over time.
 * Therapist-only view.
 */

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './ai-insights.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const label2 = score >= 0.05 ? 'POSITIVE' : score <= -0.05 ? 'NEGATIVE' : 'NEUTRAL';
  return (
    <div style={{
      background: '#1C2333', border: '1px solid #30363D',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#8B949E', marginBottom: 3 }}>Session {label}</p>
      <p style={{ color: '#F0F6FC', fontWeight: 600 }}>
        Score: {score?.toFixed(2)} ({label2})
      </p>
    </div>
  );
};

export default function EngagementTrendChart({ trend = [], loading }) {
  if (loading) {
    return <div className="skeleton" style={{ width: '100%', height: 70, borderRadius: 6 }} />;
  }

  if (!trend || trend.length < 2) {
    return (
      <div className="ai-empty" style={{ padding: '12px 0' }}>
        Not enough data — analyze more session notes to see trends.
      </div>
    );
  }

  const data = trend.map((t, i) => ({
    session: t.sessionNum || i + 1,
    score: t.score,
    label: t.label,
  }));

  return (
    <div className="engagement-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="session"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8B949E', fontSize: 10 }}
            label={{ value: 'Session', position: 'insideBottom', fill: '#484F58', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <ReferenceLine y={0.05}  stroke="rgba(34,197,94,0.3)"  strokeDasharray="3 3" />
          <ReferenceLine y={-0.05} stroke="rgba(239,68,68,0.3)"  strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#14B8A6"
            strokeWidth={2}
            dot={{ fill: '#14B8A6', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
