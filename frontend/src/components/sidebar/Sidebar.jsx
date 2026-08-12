import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Calendar,
  FileText, CreditCard, LogOut, ChevronRight,
  Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/clients',   icon: Users,           label: 'Clients'    },
  { to: '/leads',     icon: UserPlus,        label: 'Leads'      },
  { to: '/sessions',  icon: Calendar,        label: 'Sessions'   },
  { to: '/notes',     icon: FileText,        label: 'Notes'      },
  { to: '/payments',  icon: CreditCard,      label: 'Payments'   },
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
    .slice(0, 2);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Header / Logo */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--teal)" />
                <path d="M2 17l10 5 10-5" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" />
                <path d="M2 12l10 5 10-5" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="sidebar-logo-name">Unfazed</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
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
            <Icon size={18} className="sidebar-link-icon" />
            {!collapsed && <span className="sidebar-link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <p className="sidebar-user-name">{user?.name}</p>
              <p className="sidebar-user-tier">{user?.subscriptionTier || 'free'} plan</p>
            </div>
          </div>
        )}
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
