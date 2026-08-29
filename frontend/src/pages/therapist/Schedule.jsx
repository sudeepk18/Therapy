import { useEffect, useState } from 'react';
import {
  Calendar, Clock, Plus, Video, MapPin, CheckCircle,
  Save, Trash2, Sliders, AlertCircle,
} from 'lucide-react';
import { sessionsApi } from '../../api/sessions.api';
import { clientsApi } from '../../api/clients.api';
import api from '../../api/axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import '../sessions/SessionsPage.css';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' },
];

const STATUS_COLORS = {
  scheduled:    { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  completed:    { color: 'var(--success)', bg: 'var(--success-bg)' },
  'in-progress':{ color: 'var(--teal)',   bg: 'var(--teal-glow)'  },
  cancelled:    { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  'no-show':    { color: 'var(--warning)', bg: 'var(--warning-bg)' },
};

export default function Schedule() {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'availability'

  // Appointments state
  const [sessions,  setSessions]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [status,    setStatus]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Availability state
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [bufferTime, setBufferTime] = useState(15);
  const [savingAvail, setSavingAvail] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await sessionsApi.list({ status, limit: 30 });
      setSessions(res.data.data.sessions || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await api.get('/availability/weekly');
      const rules = res.data.data || [];

      // Initialize all 7 days
      const formatted = DAYS.map((d) => {
        const existing = rules.find((r) => r.dayOfWeek === d.id);
        return {
          dayOfWeek: d.id,
          name: d.name,
          isDayAvailable: existing ? existing.isDayAvailable : d.id >= 1 && d.id <= 5,
          slots: existing && existing.slots?.length > 0
            ? existing.slots
            : [{ startTime: '09:00', endTime: '17:00', isAvailable: true }],
        };
      });

      if (rules.length > 0 && rules[0].bufferBetweenSessionsMinutes !== undefined) {
        setBufferTime(rules[0].bufferBetweenSessionsMinutes);
      }
      setWeeklySchedule(formatted);
    } catch {
      toast.error('Failed to load working hours');
    }
  };

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchSessions();
    } else {
      fetchAvailability();
    }
  }, [activeTab, status]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await sessionsApi.updateStatus(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await sessionsApi.cancel(id, { cancellationReason: 'Cancelled by therapist' });
      toast.success('Appointment cancelled');
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  // Availability manipulation helpers
  const handleToggleDay = (dayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, isDayAvailable: !d.isDayAvailable } : d))
    );
  };

  const handleSlotChange = (dayOfWeek, slotIndex, field, value) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const newSlots = [...d.slots];
        newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value };
        return { ...d, slots: newSlots };
      })
    );
  };

  const handleAddSlot = (dayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          slots: [...d.slots, { startTime: '14:00', endTime: '18:00', isAvailable: true }],
        };
      })
    );
  };

  const handleRemoveSlot = (dayOfWeek, slotIndex) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          slots: d.slots.filter((_, i) => i !== slotIndex),
        };
      })
    );
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    setSavingAvail(true);
    try {
      const payload = weeklySchedule.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        isDayAvailable: d.isDayAvailable,
        slots: d.slots,
        bufferBetweenSessionsMinutes: Number(bufferTime),
        timezone: 'Asia/Kolkata',
      }));

      await api.put('/availability/weekly', { weeklySchedule: payload });
      toast.success('Weekly working hours saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save working hours');
    } finally {
      setSavingAvail(false);
    }
  };

  return (
    <div className="page">
      {/* Schedule Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'appointments' ? 'var(--teal-glow)' : 'transparent',
            color: activeTab === 'appointments' ? 'var(--teal)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'appointments' ? 600 : 500,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} /> Appointments &amp; Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'availability' ? 'var(--teal-glow)' : 'transparent',
            color: activeTab === 'availability' ? 'var(--teal)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'availability' ? 600 : 500,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Sliders size={16} /> Working Hours &amp; Availability
        </button>
      </div>

      {activeTab === 'appointments' ? (
        <>
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

          {/* Table Card */}
          <div className="table-card">
            <div className="table-meta">
              <p className="table-count">{total} appointment{total !== 1 ? 's' : ''} found</p>
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
                          <p>No appointments scheduled</p>
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
        </>
      ) : (
        /* Availability Configuration Hub */
        <form onSubmit={handleSaveAvailability} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Buffer & Global Settings */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Buffer Time Between Sessions
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Time automatically reserved after each appointment for notes and rest.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="filter-select"
                value={bufferTime}
                onChange={(e) => setBufferTime(e.target.value)}
                style={{ width: 140 }}
              >
                <option value={0}>0 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          {/* Weekly Days Accordion / List */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Recurring Weekly Working Hours
            </h4>

            {weeklySchedule.map((day) => (
              <div
                key={day.dayOfWeek}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: 16,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={day.isDayAvailable}
                      onChange={() => handleToggleDay(day.dayOfWeek)}
                      style={{ width: 16, height: 16, accentColor: 'var(--teal)' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: day.isDayAvailable ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {day.name}
                    </span>
                  </label>
                  {!day.isDayAvailable && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unavailable (Day off)</span>
                  )}
                </div>

                {day.isDayAvailable && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 26 }}>
                    {day.slots.map((slot, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="time"
                          className="modal-input"
                          value={slot.startTime}
                          onChange={(e) => handleSlotChange(day.dayOfWeek, sIdx, 'startTime', e.target.value)}
                          style={{ width: 110 }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>to</span>
                        <input
                          type="time"
                          className="modal-input"
                          value={slot.endTime}
                          onChange={(e) => handleSlotChange(day.dayOfWeek, sIdx, 'endTime', e.target.value)}
                          style={{ width: 110 }}
                        />
                        {day.slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(day.dayOfWeek, sIdx)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                            title="Remove window"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddSlot(day.dayOfWeek)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--teal)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        alignSelf: 'flex-start',
                        marginTop: 4,
                      }}
                    >
                      <Plus size={13} /> Add Working Window
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="submit" className="btn-primary" disabled={savingAvail}>
                <Save size={15} />
                {savingAvail ? 'Saving Hours…' : 'Save Working Hours'}
              </button>
            </div>
          </div>
        </form>
      )}

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
                <option value={45}>45 mins</option>
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
