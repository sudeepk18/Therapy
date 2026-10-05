import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Calendar,
  FileText, CreditCard, LogOut, ChevronRight,
  Menu, BarChart2, Settings, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/therapist/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/therapist/clients',   icon: Users,           label: 'Clients'    },
  { to: '/therapist/leads',     icon: UserPlus,        label: 'Leads'      },
  { to: '/therapist/schedule',  icon: Calendar,        label: 'Schedule'   },
  { to: '/therapist/notes',     icon: FileText,        label: 'Notes'      },
  { to: '/therapist/payments',  icon: CreditCard,      label: 'Payments'   },
  { to: '/therapist/analytics', icon: BarChart2,       label: 'Analytics'  },
  { to: '/therapist/settings',  icon: Settings,        label: 'Settings'   },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'TH';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Header / Logo */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#teal-grad)" />
                <path d="M2 17l10 5 10-5" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="teal-grad" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#22D3EE" />
                    <stop offset="1" stopColor="#0891B2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="sidebar-logo-text-group">
              <span className="sidebar-logo-name">Unfazed</span>
              <span className="sidebar-logo-badge">PRO</span>
            </div>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <div className="sidebar-link-icon-wrap">
              <Icon size={18} className="sidebar-link-icon" />
            </div>
            {!collapsed && <span className="sidebar-link-label">{label}</span>}
            <span className="sidebar-link-active-pill" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="sidebar-user">
            <div className="sidebar-avatar-wrap">
              <div className="sidebar-avatar">{initials}</div>
              <span className="sidebar-status-dot" title="Active" />
            </div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name" title={user?.name}>{user?.name || 'Therapist'}</p>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-tier">{user?.subscriptionTier || 'Standard'}</span>
                <span className="sidebar-user-dot">•</span>
                <span className="sidebar-user-role">Online</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="sidebar-avatar-wrap sidebar-avatar-wrap--collapsed" title={user?.name}>
            <div className="sidebar-avatar">{initials}</div>
            <span className="sidebar-status-dot" />
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
