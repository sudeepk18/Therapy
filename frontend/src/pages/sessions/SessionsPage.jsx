import { useEffect, useState } from 'react';
import { Plus, Search, Calendar, Video, MapPin, Clock } from 'lucide-react';
import { sessionsApi } from '../../api/sessions.api';
import { clientsApi } from '../../api/clients.api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import './SessionsPage.css';

const STATUS_COLORS = {
  scheduled:    { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  completed:    { color: 'var(--success)', bg: 'var(--success-bg)' },
  'in-progress':{ color: 'var(--teal)',   bg: 'var(--teal-glow)'  },
  cancelled:    { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  'no-show':    { color: 'var(--warning)', bg: 'var(--warning-bg)' },
};

export default function SessionsPage() {
  const [sessions,  setSessions]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [status,    setStatus]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsApi.list({ status, limit: 30 });
      setSessions(res.data.data.sessions || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [status]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await sessionsApi.updateStatus(id, { status: newStatus });
      toast.success(`Session status updated to ${newStatus}`);
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    try {
      await sessionsApi.cancel(id, { cancellationReason: 'Cancelled by therapist' });
      toast.success('Session cancelled');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel session');
    }
  };

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select
            id="session-status-filter"
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button id="book-session-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Book Appointment
        </button>
      </div>

      {/* Sessions Grid / Table Card */}
      <div className="table-card">
        <div className="table-meta">
          <p className="table-count">{total} session{total !== 1 ? 's' : ''} found</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Client</th>
                <th>Medium</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 14, borderRadius: 4, width: 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <Calendar size={32} />
                      <p>No sessions scheduled yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const st = STATUS_COLORS[s.status] || STATUS_COLORS.scheduled;
                  const clientName = s.clientId?.name || 'Client';
                  return (
                    <tr key={s._id} className="table-row-hover">
                      <td>
                        <div className="session-time-cell">
                          <Clock size={14} className="session-clock-icon" />
                          <span>{format(new Date(s.scheduledAt), 'dd MMM yyyy, h:mm a')}</span>
                        </div>
                      </td>
                      <td>
                        <span className="session-client-name">{clientName}</span>
                      </td>
                      <td className="text-secondary">
                        <span className="session-medium-chip">
                          {s.medium === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                          {s.medium || 'in-person'}
                        </span>
                      </td>
                      <td className="text-secondary">{s.sessionType || 'individual'}</td>
                      <td className="text-secondary">{s.durationMinutes || 50} min</td>
                      <td>
                        <span className="status-badge" style={{ color: st.color, background: st.bg }}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="session-actions">
                          {s.status === 'scheduled' && (
                            <>
                              <button
                                className="action-btn action-btn--complete"
                                onClick={() => handleStatusChange(s._id, 'completed')}
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                              <button
                                className="action-btn action-btn--cancel"
                                onClick={() => handleCancel(s._id)}
                                title="Cancel session"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {s.status === 'completed' && (
                            <span className="action-done">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BookSessionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchSessions();
          }}
        />
      )}
    </div>
  );
}

function BookSessionModal({ onClose, onSuccess }) {
  const [clients, setClients] = useState([]);
  const [form, setForm]       = useState({
    clientId: '',
    scheduledAt: '',
    durationMinutes: 50,
    medium: 'online',
    sessionType: 'individual',
    notes: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    clientsApi.list({ limit: 100, status: 'active' }).then((res) => {
      setClients(res.data.data.clients || []);
      if (res.data.data.clients?.length) {
        setForm((f) => ({ ...f, clientId: res.data.data.clients[0]._id }));
      }
    });
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!form.scheduledAt) {
      toast.error('Please pick date & time');
      return;
    }
    setBusy(true);
    try {
      await sessionsApi.book(form);
      toast.success('Session booked successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book session');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Book New Appointment</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Client
            <select
              name="clientId"
              className="modal-input"
              value={form.clientId}
              onChange={handleChange}
              required
            >
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          <label>
            Date &amp; Time
            <input
              name="scheduledAt"
              type="datetime-local"
              className="modal-input"
              value={form.scheduledAt}
              onChange={handleChange}
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Medium
              <select name="medium" className="modal-input" value={form.medium} onChange={handleChange}>
                <option value="online">Online Video</option>
                <option value="in-person">In-Person</option>
                <option value="phone">Phone Call</option>
              </select>
            </label>

            <label>
              Duration (minutes)
              <select
                name="durationMinutes"
                className="modal-input"
                value={form.durationMinutes}
                onChange={handleChange}
              >
                <option value={30}>30 mins</option>
                <option value={50}>50 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </label>
          </div>

          <label>
            Session Type
            <select
              name="sessionType"
              className="modal-input"
              value={form.sessionType}
              onChange={handleChange}
            >
              <option value="individual">Individual Therapy</option>
              <option value="couples">Couples Therapy</option>
              <option value="family">Family Therapy</option>
              <option value="consultation">Initial Consultation</option>
            </select>
          </label>

          <label>
            Notes / Internal Memo
            <textarea
              name="notes"
              className="modal-input"
              rows={2}
              placeholder="Optional pre-session notes…"
              value={form.notes}
              onChange={handleChange}
            />
          </label>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Booking…' : 'Book Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
