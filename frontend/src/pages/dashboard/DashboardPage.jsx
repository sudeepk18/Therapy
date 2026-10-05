import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, CreditCard, UserPlus, TrendingUp, Clock,
  Plus, CalendarPlus, Sparkles,
} from 'lucide-react';
import { clientsApi }  from '../../api/clients.api';
import { sessionsApi } from '../../api/sessions.api';
import { leadsApi }    from '../../api/leads.api';
import { paymentsApi } from '../../api/payments.api';
import StatCard        from '../../components/stats/StatCard';
import RecentClients   from '../../components/dashboard/RecentClients';
import UpcomingSessions from '../../components/dashboard/UpcomingSessions';
import RevenueChart    from '../../components/charts/RevenueChart';
import AIInsightsSection from '../../components/ai/AIInsightsSection';
import { useAuth }     from '../../contexts/AuthContext';
import './DashboardPage.css';
import CrisisAlertBanner from '../../components/crisis/CrisisAlertBanner';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

    const handleUpdate = () => {
      fetchAll();
    };
    window.addEventListener('payment-updated', handleUpdate);
    window.addEventListener('appointment-updated', handleUpdate);
    return () => {
      window.removeEventListener('payment-updated', handleUpdate);
      window.removeEventListener('appointment-updated', handleUpdate);
    };
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
    <div className="dashboard animate-fade-in">
      {/* Hero Greeting Section */}
      <div className="dashboard-hero">
        <div className="dashboard-greeting">
          <h2 className="greeting-text">
            {greeting}, <span className="greeting-name">{user?.name?.split(' ')[0]}</span> 👋
          </h2>
          <div className="greeting-sub-row">
            <span className="greeting-date-badge">
              <Calendar size={13} className="greeting-cal-icon" />
              {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="greeting-dot">•</span>
            <span className="greeting-summary">Here is what's happening with your practice today</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-actions">
          <button
            className="btn btn-secondary dashboard-action-btn"
            onClick={() => navigate('/therapist/clients')}
          >
            <UserPlus size={15} />
            <span>Add Client</span>
          </button>
          <button
            className="btn btn-primary dashboard-action-btn"
            onClick={() => navigate('/therapist/schedule')}
          >
            <CalendarPlus size={15} />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Crisis Safety Alerts (SOS Early Warning) */}
      <CrisisAlertBanner />

      {/* Stat Cards Grid */}
      <div className="dashboard-stats">
        {statCards.map((card) => (
          <StatCard key={card.id} {...card} loading={loading} />
        ))}
      </div>

      {/* Main Grid: Revenue & Sessions */}
      <div className="dashboard-grid">
        {/* Left: Revenue chart */}
        <div className="dashboard-card glass-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <div className="card-icon-halo card-icon-halo--teal">
                <TrendingUp size={16} />
              </div>
              <div>
                <h3 className="card-title">Revenue Overview</h3>
                <p className="card-subtitle">Monthly earnings & session breakdown</p>
              </div>
            </div>
            <span className="card-badge">Year to date</span>
          </div>
          <RevenueChart data={revenue?.byType || []} loading={loading} />
        </div>

        {/* Right: Upcoming sessions */}
        <div className="dashboard-card glass-card">
          <div className="card-header">
            <div className="card-title-wrap">
              <div className="card-icon-halo card-icon-halo--violet">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="card-title">Upcoming Sessions</h3>
                <p className="card-subtitle">Next appointments in queue</p>
              </div>
            </div>
            <button
              className="card-header-link"
              onClick={() => navigate('/therapist/schedule')}
            >
              View all
            </button>
          </div>
          <UpcomingSessions sessions={sessions} loading={loading} />
        </div>
      </div>

      {/* AI Insights Intelligence Section */}
      <AIInsightsSection />

      {/* Recent clients */}
      <div className="dashboard-card glass-card">
        <div className="card-header">
          <div className="card-title-wrap">
            <div className="card-icon-halo card-icon-halo--teal">
              <Users size={16} />
            </div>
            <div>
              <h3 className="card-title">Recent Clients</h3>
              <p className="card-subtitle">Quick access to client records & status</p>
            </div>
          </div>
          <button
            className="card-header-link"
            onClick={() => navigate('/therapist/clients')}
          >
            Manage clients
          </button>
        </div>
        <RecentClients clients={clients} loading={loading} />
      </div>
    </div>
  );
}
