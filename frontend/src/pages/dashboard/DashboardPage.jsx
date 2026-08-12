import { useEffect, useState } from 'react';
import { Users, Calendar, CreditCard, UserPlus, TrendingUp, Clock } from 'lucide-react';
import { clientsApi }  from '../../api/clients.api';
import { sessionsApi } from '../../api/sessions.api';
import { leadsApi }    from '../../api/leads.api';
import { paymentsApi } from '../../api/payments.api';
import StatCard        from '../../components/stats/StatCard';
import RecentClients   from '../../components/dashboard/RecentClients';
import UpcomingSessions from '../../components/dashboard/UpcomingSessions';
import RevenueChart    from '../../components/charts/RevenueChart';
import { useAuth }     from '../../contexts/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [revenue,  setRevenue]  = useState(null);
  const [sessions, setSessions] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' :
                   today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [clientsRes, sessionsRes, leadsRes, revenueRes] = await Promise.allSettled([
          clientsApi.list({ limit: 5, status: 'active' }),
          sessionsApi.list({ limit: 10 }),
          leadsApi.list({ limit: 1 }),
          paymentsApi.revenueSummary({ year: today.getFullYear() }),
        ]);

        const clientData  = clientsRes.status  === 'fulfilled' ? clientsRes.value.data.data  : {};
        const sessionData = sessionsRes.status === 'fulfilled' ? sessionsRes.value.data.data : {};
        const leadData    = leadsRes.status    === 'fulfilled' ? leadsRes.value.data.data    : {};
        const revData     = revenueRes.status  === 'fulfilled' ? revenueRes.value.data.data  : {};

        setStats({
          totalClients:  clientData.pagination?.total ?? 0,
          totalSessions: sessionData.pagination?.total ?? 0,
          activeLeads:   leadData.pagination?.total ?? 0,
          revenue:       revData.totalRevenue ?? 0,
        });
        setRevenue(revData);
        setClients(clientData.clients || []);
        setSessions(sessionData.sessions || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    {
      id: 'stat-clients',
      label: 'Total Clients',
      value: stats?.totalClients ?? '—',
      icon: Users,
      color: 'teal',
      trend: '+12% this month',
    },
    {
      id: 'stat-sessions',
      label: 'Total Sessions',
      value: stats?.totalSessions ?? '—',
      icon: Calendar,
      color: 'violet',
      trend: 'All time',
    },
    {
      id: 'stat-revenue',
      label: 'Revenue (YTD)',
      value: stats ? `₹${(stats.revenue / 100).toLocaleString('en-IN')}` : '—',
      icon: CreditCard,
      color: 'success',
      trend: `FY ${today.getFullYear()}`,
    },
    {
      id: 'stat-leads',
      label: 'Active Leads',
      value: stats?.activeLeads ?? '—',
      icon: UserPlus,
      color: 'warning',
      trend: 'In pipeline',
    },
  ];

  return (
    <div className="dashboard">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <h2 className="greeting-text">
          {greeting}, <span className="greeting-name">{user?.name?.split(' ')[0]}</span> 👋
        </h2>
        <p className="greeting-sub">
          {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-stats">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} loading={loading} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left: Revenue chart */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <TrendingUp size={16} className="card-title-icon" />
              <h3 className="card-title">Revenue Overview</h3>
            </div>
            <span className="card-badge">Year to date</span>
          </div>
          <RevenueChart data={revenue?.byType || []} loading={loading} />
        </div>

        {/* Right: Upcoming sessions */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <Clock size={16} className="card-title-icon" />
              <h3 className="card-title">Upcoming Sessions</h3>
            </div>
          </div>
          <UpcomingSessions sessions={sessions} loading={loading} />
        </div>
      </div>

      {/* Recent clients */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title-wrap">
            <Users size={16} className="card-title-icon" />
            <h3 className="card-title">Recent Clients</h3>
          </div>
        </div>
        <RecentClients clients={clients} loading={loading} />
      </div>
    </div>
  );
}
