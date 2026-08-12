import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const PAGE_TITLES = {
  '/dashboard': { label: 'Dashboard',  sub: 'Welcome back' },
  '/clients':   { label: 'Clients',    sub: 'Manage your client list' },
  '/leads':     { label: 'Leads',      sub: 'CRM & enquiry pipeline' },
  '/sessions':  { label: 'Sessions',   sub: 'Appointments & scheduling' },
  '/notes':     { label: 'Notes',      sub: 'Clinical session notes' },
  '/payments':  { label: 'Payments',   sub: 'Revenue & transactions' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const base = '/' + pathname.split('/')[1];
  const page = PAGE_TITLES[base] || { label: 'Unfazed', sub: '' };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{page.label}</h1>
        {page.sub && <p className="header-sub">{page.sub}</p>}
      </div>

      <div className="header-right">
        <button className="header-bell" aria-label="Notifications">
          <Bell size={18} />
          <span className="header-bell-dot" />
        </button>
        <div className="header-user">
          <div className="header-avatar">{initials}</div>
          <div className="header-user-info">
            <p className="header-user-name">{user?.name}</p>
            <p className="header-user-role">Therapist</p>
          </div>
        </div>
      </div>
    </header>
  );
}
