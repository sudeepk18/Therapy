/**
 * RevenueForecastChart.jsx
 * Recharts-based chart showing historical revenue + AI forecast.
 * Uses the existing Recharts installation.
 */

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import './ai-insights.css';

const HISTORY_COLOR  = '#14B8A6';
const FORECAST_COLOR = '#7C3AED';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const isForecast = payload[0]?.payload?.isForecast;
  return (
    <div style={{
      background: '#1C2333', border: '1px solid #30363D',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#8B949E', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || '#F0F6FC', fontWeight: 600, marginBottom: 2 }}>
          {p.name}: ₹{((p.value || 0) / 100).toLocaleString('en-IN')}
          {isForecast && <span style={{ color: '#8B949E', fontSize: 10, marginLeft: 4 }}>(Estimate)</span>}
        </p>
      ))}
    </div>
  );
};

export default function RevenueForecastChart({ history = [], forecast = [], loading }) {
  if (loading) {
    return (
      <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 8px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: `${30 + i * 12}px`, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  // Merge history + forecast for the chart
  const historyPoints = history.slice(-6).map(h => ({
    label: `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][h.month - 1]} ${String(h.year).slice(2)}`,
    revenue: h.revenue,
    isForecast: false,
  }));

  const forecastPoints = forecast.map(f => ({
    label: f.month_label,
    forecastRevenue: f.forecast,
    isForecast: true,
  }));

  const allPoints = [...historyPoints, ...forecastPoints];

  if (allPoints.length === 0) {
    return (
      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        Not enough data for forecast
      </div>
    );
  }

  // Find where forecast starts (for reference line)
  const splitIndex = historyPoints.length;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <ComposedChart data={allPoints} barSize={22}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8B949E', fontSize: 11 }}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {splitIndex > 0 && splitIndex < allPoints.length && (
          <ReferenceLine
            x={allPoints[splitIndex]?.label}
            stroke="#30363D"
            strokeDasharray="3 3"
            label={{ value: 'Forecast →', fill: '#8B949E', fontSize: 10 }}
          />
        )}
        <Bar dataKey="revenue" fill={HISTORY_COLOR} radius={[3,3,0,0]} name="Revenue" />
        <Line
          type="monotone"
          dataKey="forecastRevenue"
          stroke={FORECAST_COLOR}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={{ fill: FORECAST_COLOR, r: 3 }}
          name="Forecast"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
