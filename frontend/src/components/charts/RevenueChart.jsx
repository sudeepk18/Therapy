import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#14B8A6', '#7C3AED', '#3B82F6', '#F59E0B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1C2333', border: '1px solid #30363D',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: '#8B949E', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#F0F6FC', fontWeight: 600 }}>
        ₹{(payload[0].value / 100).toLocaleString('en-IN')}
      </p>
    </div>
  );
};

export default function RevenueChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: `${40 + i * 20}px`, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  const chartData = data.length
    ? data.map((d) => ({ name: d._id, revenue: d.totalRevenue }))
    : [
        { name: 'session', revenue: 0 },
        { name: 'package', revenue: 0 },
        { name: 'manual',  revenue: 0 },
      ];

  if (chartData.every((d) => d.revenue === 0)) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No revenue data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} barSize={36}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8B949E', fontSize: 12 }}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
