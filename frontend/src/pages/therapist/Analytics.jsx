import { useEffect, useState } from 'react';
import {
  TrendingUp, CreditCard, Users, Calendar,
  BarChart2, Lock
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { paymentsApi } from '../../api/payments.api';
import { sessionsApi } from '../../api/sessions.api';
import { clientsApi  } from '../../api/clients.api';
import { useEntitlement } from '../../hooks/useEntitlement';
import toast from 'react-hot-toast';
import '../../pages/clients/ClientsPage.css';
import './Analytics.css';

const COLORS = ['#14B8A6', '#7C3AED', '#3B82F6', '#F59E0B', '#EF4444'];

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

export default function Analytics() {
  const { can, tier } = useEntitlement();
  const [revenue,  setRevenue]  = useState(null);
  const [sessions, setSessions] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const year = new Date().getFullYear();

  useEffect(() => {
    if (!can('analytics')) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [rRes, sRes, cRes] = await Promise.allSettled([
          paymentsApi.revenueSummary({ year }),
          sessionsApi.list({ limit: 200 }),
          clientsApi.list({ limit: 200 }),
        ]);
        if (rRes.status === 'fulfilled') setRevenue(rRes.value.data.data);
        if (sRes.status === 'fulfilled') setSessions(sRes.value.data.data.sessions || []);
        if (cRes.status === 'fulfilled') setClients(cRes.value.data.data.clients || []);
      } catch {
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ── Paywalled ── */
  if (!can('analytics')) {
    return (
      <div className="analytics-locked">
        <div className="locked-icon"><Lock size={32} /></div>
        <h2>Analytics is a Pro feature</h2>
        <p>Upgrade to the <strong>Pro</strong> plan to unlock revenue charts,
           session trends, and client growth insights.</p>
        <div className="locked-tier-badge">Current plan: <strong>{tier}</strong></div>
      </div>
    );
  }

  /* ── Build chart data ── */
  // Revenue by month from byType grouping
  const revenueByType = (revenue?.byType || []).map((d, i) => ({
    name: d._id,
    value: d.totalRevenue,
    fill: COLORS[i % COLORS.length],
  }));

  // Sessions by status
  const statusCounts = sessions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const sessionStatusData = Object.entries(statusCounts).map(([k, v], i) => ({
    name: k, value: v, fill: COLORS[i % COLORS.length],
  }));

  // Clients added per month (last 6 months)
  const clientsByMonth = (() => {
    const months = {};
    clients.forEach(c => {
      const d = new Date(c.createdAt);
      const key = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).slice(-6).map(([name, count]) => ({ name, count }));
  })();

  const totalRevenue = revenue?.totalRevenue ?? 0;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  return (
    <div className="page">
      {/* Summary Row */}
      <div className="analytics-summary-row">
        <AnalyticCard
          icon={<TrendingUp size={18} />}
          label="YTD Revenue"
          value={`₹${(totalRevenue / 100).toLocaleString('en-IN')}`}
          color="teal"
        />
        <AnalyticCard
          icon={<Calendar size={18} />}
          label="Completed Sessions"
          value={completedSessions}
          color="violet"
        />
        <AnalyticCard
          icon={<Users size={18} />}
          label="Active Clients"
          value={activeClients}
          color="success"
        />
        <AnalyticCard
          icon={<CreditCard size={18} />}
          label="Payment Types"
          value={revenueByType.length}
          color="warning"
        />
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">
        {/* Revenue by Type */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <BarChart2 size={15} color="var(--teal)" />
            <h3 className="analytics-card-title">Revenue by Payment Type</h3>
          </div>
          {revenueByType.length === 0 ? (
            <div className="analytics-empty">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={revenueByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {revenueByType.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `₹${(v / 100).toLocaleString('en-IN')}`}
                  contentStyle={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8 }}
                  labelStyle={{ color: '#8B949E' }}
                  itemStyle={{ color: '#F0F6FC' }}
                />
                <Legend
                  iconType="circle"
                  formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Session Status Breakdown */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <Calendar size={15} color="var(--violet)" />
            <h3 className="analytics-card-title">Session Status Breakdown</h3>
          </div>
          {sessionStatusData.length === 0 ? (
            <div className="analytics-empty">No session data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sessionStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {sessionStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8 }}
                  itemStyle={{ color: '#F0F6FC' }}
                />
                <Legend
                  iconType="circle"
                  formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Client Growth */}
        <div className="analytics-card analytics-card--wide">
          <div className="analytics-card-header">
            <Users size={15} color="var(--success)" />
            <h3 className="analytics-card-title">New Clients Added (Last 6 Months)</h3>
          </div>
          {clientsByMonth.length === 0 ? (
            <div className="analytics-empty">No client data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={clientsByMonth}>
                <defs>
                  <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#14B8A6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E2836" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8B949E', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8B949E', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8 }}
                  itemStyle={{ color: '#F0F6FC' }}
                  labelStyle={{ color: '#8B949E' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  fill="url(#clientGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalyticCard({ icon, label, value, color }) {
  const colorMap = {
    teal:    { bg: 'var(--teal-glow)',    icon: 'var(--teal)'    },
    violet:  { bg: 'var(--violet-glow)', icon: 'var(--violet)'  },
    success: { bg: 'var(--success-bg)',  icon: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)',  icon: 'var(--warning)' },
  };
  const c = colorMap[color] || colorMap.teal;
  return (
    <div className="analytic-card">
      <div className="analytic-card-icon" style={{ background: c.bg, color: c.icon }}>
        {icon}
      </div>
      <p className="analytic-card-label">{label}</p>
      <p className="analytic-card-value">{value}</p>
    </div>
  );
}
