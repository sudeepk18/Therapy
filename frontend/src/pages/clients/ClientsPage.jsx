import { useEffect, useState } from 'react';
import { Plus, Search, LayoutGrid, List, Users } from 'lucide-react';
import { clientsApi } from '../../api/clients.api';
import ClientTable from '../../components/crm/ClientTable';
import ClientCard from '../../components/crm/ClientCard';
import toast from 'react-hot-toast';
import './ClientsPage.css';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [tag,     setTag]     = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await clientsApi.list({ search, status, tag, limit: 50 });
      setClients(res.data.data.clients || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, status, tag]);

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-search">
          <Search size={15} className="search-icon" />
          <input
            id="client-search"
            className="search-input"
            placeholder="Search clients by name, email, or phone…"
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
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_hold">On Hold</option>
            <option value="discharged">Discharged</option>
            <option value="waitlist">Waitlist</option>
          </select>

          <select
            id="client-tag-filter"
            className="filter-select"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">All Risk Tags</option>
            <option value="low_risk">Low Risk</option>
            <option value="moderate_risk">Moderate Risk</option>
            <option value="high_risk">High Risk</option>
            <option value="vip">VIP</option>
            <option value="new">New</option>
          </select>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent',
                color: viewMode === 'table' ? 'var(--teal)' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Table View"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--teal)' : 'var(--text-muted)',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button id="add-client-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add New Client
        </button>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="table-card">
          <div className="table-meta">
            <p className="table-count">{total} client{total !== 1 ? 's' : ''} in practice</p>
          </div>
          <ClientTable clients={clients} loading={loading} />
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Showing {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {clients.map((c) => (
              <ClientCard key={c._id} client={c} />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchClients();
          }}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Female',
    tag: 'new',
    status: 'active',
    presentingConcerns: '',
    goals: '',
  });
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await clientsApi.create({
        name: form.name,
        email: form.email,
        phone: form.phone,
        gender: form.gender,
        tag: form.tag,
        status: form.status,
        intake: {
          presentingConcerns: form.presentingConcerns,
          goals: form.goals,
        },
      });
      toast.success('Client added successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add client');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h3 className="modal-title">Onboard New Client</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Full Name
              <input
                name="name"
                className="modal-input"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Email Address
              <input
                name="email"
                type="email"
                className="modal-input"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Phone Number
              <input
                name="phone"
                type="tel"
                className="modal-input"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={handleChange}
              />
            </label>
            <label>
              Gender Identity
              <select name="gender" className="modal-input" value={form.gender} onChange={handleChange}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Clinical Tag
              <select name="tag" className="modal-input" value={form.tag} onChange={handleChange}>
                <option value="new">New Client</option>
                <option value="low_risk">Low Risk</option>
                <option value="moderate_risk">Moderate Risk</option>
                <option value="high_risk">High Risk</option>
                <option value="vip">VIP</option>
                <option value="none">None</option>
              </select>
            </label>
            <label>
              Care Status
              <select name="status" className="modal-input" value={form.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_hold">On Hold</option>
                <option value="waitlist">Waitlist</option>
              </select>
            </label>
          </div>

          <label>
            Presenting Concerns / Clinical Focus
            <textarea
              name="presentingConcerns"
              className="modal-input"
              rows={2}
              placeholder="e.g. Work stress, generalized anxiety, life transition..."
              value={form.presentingConcerns}
              onChange={handleChange}
            />
          </label>

          <label>
            Therapy Goals
            <textarea
              name="goals"
              className="modal-input"
              rows={2}
              placeholder="Client's self-stated goals..."
              value={form.goals}
              onChange={handleChange}
            />
          </label>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Onboarding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
