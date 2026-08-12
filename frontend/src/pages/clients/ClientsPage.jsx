import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import toast from 'react-hot-toast';
import './ClientsPage.css';

const STATUS_COLORS = {
  active:     { color: 'var(--success)', bg: 'var(--success-bg)' },
  inactive:   { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  discharged: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  onhold:     { color: 'var(--info)',    bg: 'var(--info-bg)'    },
};

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await clientsApi.list({ search, status, limit: 20 });
      setClients(res.data.data.clients || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, [search, status]);

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-search">
          <Search size={15} className="search-icon" />
          <input
            id="client-search"
            className="search-input"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <select
            id="client-status-filter"
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>
        <button id="add-client-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-meta">
          <p className="table-count">{total} client{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4, width: j === 0 ? 120 : 80 }} /></td>
                      ))}
                    </tr>
                  ))
                : clients.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty">
                        <Users size={32} />
                        <p>No clients found</p>
                      </div>
                    </td>
                  </tr>
                )
                : clients.map((c) => {
                    const st = STATUS_COLORS[c.status] || STATUS_COLORS.active;
                    const initials = c.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                    return (
                      <tr key={c._id} className="table-row-hover">
                        <td>
                          <div className="client-name-cell">
                            <div className="table-avatar">{initials}</div>
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="text-secondary">{c.email}</td>
                        <td className="text-secondary">{c.phone || '—'}</td>
                        <td>
                          <span className="status-badge" style={{ color: st.color, background: st.bg }}>
                            {c.status}
                          </span>
                        </td>
                        <td className="text-secondary">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <Link to={`/clients/${c._id}`} className="table-action">View</Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showModal && <AddClientModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchClients(); }} />}
    </div>
  );
}

function AddClientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '' });
  const [busy, setBusy] = useState(false);
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await clientsApi.create(form);
      toast.success('Client added!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add client');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New Client</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Full Name
            <input name="name" className="modal-input" placeholder="Jane Smith" value={form.name} onChange={handleChange} required />
          </label>
          <label>Email
            <input name="email" type="email" className="modal-input" placeholder="jane@example.com" value={form.email} onChange={handleChange} required />
          </label>
          <label>Phone
            <input name="phone" className="modal-input" placeholder="+91 9999 999999" value={form.phone} onChange={handleChange} />
          </label>
          <label>Date of Birth
            <input name="dateOfBirth" type="date" className="modal-input" value={form.dateOfBirth} onChange={handleChange} />
          </label>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
