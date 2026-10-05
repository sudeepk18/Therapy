import { useEffect, useState } from 'react';
import { Plus, UserPlus, Calendar, Clock, Check, Video, Phone, Mail, ArrowRight, Inbox, Sparkles, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { leadsApi } from '../../api/leads.api';
import toast from 'react-hot-toast';
import '../clients/ClientsPage.css';
import './LeadsPage.css';

const STAGES = [
  'new',
  'contacted',
  'consultation_scheduled',
  'in_discussion',
  'converted',
  'lost',
];

const STAGE_LABELS = {
  new:                    'New',
  contacted:              'Contacted',
  consultation_scheduled: 'Consult Scheduled',
  in_discussion:          'In Discussion',
  converted:              'Converted',
  lost:                   'Lost',
};

const NEXT_STAGE_PROMPT = {
  new:                    { next: 'contacted', label: 'Move to Contacted →' },
  contacted:              { next: 'consultation_scheduled', label: 'Schedule Consult →' },
  consultation_scheduled: { next: 'in_discussion', label: 'In Discussion →' },
  in_discussion:          { next: 'converted', label: 'Convert to Client ★' },
};

const STAGE_COLORS = {
  new:                    { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  contacted:              { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  consultation_scheduled: { color: 'var(--violet)',  bg: 'var(--violet-glow)'},
  in_discussion:          { color: 'var(--teal)',    bg: 'var(--teal-glow)'  },
  converted:              { color: 'var(--success)', bg: 'var(--success-bg)' },
  lost:                   { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
};

export default function LeadsPage() {
  const [leads,          setLeads]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [draggedLeadId,  setDraggedLeadId]  = useState(null);
  const [dragOverStage,  setDragOverStage]  = useState(null);
  const [selectedLead,   setSelectedLead]   = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadsApi.list({ limit: 50 });
      setLeads(res.data.data.leads || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const grouped = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s);
    return acc;
  }, {});

  // Update lead stage (drag-and-drop or dropdown/button)
  const handleStatusChange = async (leadId, newStatus) => {
    if (!newStatus || !STAGES.includes(newStatus)) return;
    
    // If moving to converted via handleConvert
    if (newStatus === 'converted') {
      handleConvert(leadId);
      return;
    }

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      await leadsApi.update(leadId, { status: newStatus });
      toast.success(`Lead moved to "${STAGE_LABELS[newStatus]}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lead status');
      fetchLeads();
    }
  };

  const handleConvert = async (id) => {
    try {
      await leadsApi.convert(id);
      toast.success('Lead converted to client!');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    }
  };

  const handleAcceptAppointment = async (id) => {
    try {
      await leadsApi.acceptAppointment(id);
      toast.success('Appointment accepted and added to schedule! Time slot is now closed.');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept appointment');
    }
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <p className="table-count">{leads.length} lead{leads.length !== 1 ? 's' : ''} in pipeline</p>
        </div>
        <div style={{ flex: 1 }} />
        <button id="add-lead-btn" className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} strokeWidth={2.4} /> Add Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {STAGES.map((stage) => {
          const sc = STAGE_COLORS[stage];
          const isOver = dragOverStage === stage;
          const stageLeads = grouped[stage] || [];

          return (
            <div
              key={stage}
              className={`kanban-col ${isOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverStage !== stage) setDragOverStage(stage);
              }}
              onDragLeave={(e) => {
                // Only clear if leaving the column element itself
                if (e.currentTarget.contains(e.relatedTarget)) return;
                if (dragOverStage === stage) setDragOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const leadId = e.dataTransfer.getData('leadId') || draggedLeadId;
                if (leadId) {
                  handleStatusChange(leadId, stage);
                }
              }}
            >
              {/* Column Header */}
              <div className="kanban-col-header">
                <span className="kanban-stage" style={{ color: sc.color }}>
                  {STAGE_LABELS[stage]}
                </span>
                <span className="kanban-count">{stageLeads.length}</span>
              </div>

              {/* Cards Container */}
              <div className="kanban-cards">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="kanban-card skeleton" style={{ height: 110 }} />
                  ))
                ) : stageLeads.length === 0 ? (
                  /* Empty state drop zone for this column */
                  <div className="kanban-empty-dropzone">
                    <Inbox size={22} className="kanban-empty-icon" />
                    <span className="kanban-empty-title">No leads here</span>
                    <span className="kanban-empty-hint">Drag a card or change status to move leads here</span>
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const isDragging = draggedLeadId === lead._id;
                    const nextAction = NEXT_STAGE_PROMPT[stage];

                    return (
                      <div
                        key={lead._id}
                        className={`kanban-card ${isDragging ? 'is-dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDraggedLeadId(lead._id);
                          e.dataTransfer.setData('leadId', lead._id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedLeadId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        {/* Top Info */}
                        <div className="kanban-card-top">
                          <p className="kanban-name">{lead.name}</p>
                          {lead.priority && (
                            <span className={`kanban-priority-pill priority-${lead.priority}`}>
                              {lead.priority}
                            </span>
                          )}
                        </div>

                        {/* Contact details */}
                        {lead.email && (
                          <div className="kanban-meta-row">
                            <Mail size={12} />
                            <span className="kanban-email">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="kanban-meta-row">
                            <Phone size={12} />
                            <span>{lead.phone}</span>
                          </div>
                        )}

                        {/* Appointment Request notification banner */}
                        {lead.appointmentRequest?.status === 'pending' && (
                          <div
                            className="kanban-app-request"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="kanban-app-request-top">
                              <Calendar size={13} />
                              <span>Enquiry Consult Requested</span>
                            </div>
                            <button
                              type="button"
                              className="kanban-app-btn"
                              onClick={() => handleAcceptAppointment(lead._id)}
                            >
                              <CheckCircle2 size={12} /> Accept &amp; Confirm
                            </button>
                          </div>
                        )}

                        {/* Actions & Stage Mover */}
                        <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="kanban-action-row">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              className="kanban-stage-select"
                              title="Change stage"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  Stage: {STAGE_LABELS[s]}
                                </option>
                              ))}
                            </select>

                            {nextAction && stage !== 'in_discussion' && (
                              <button
                                type="button"
                                className="kanban-next-btn"
                                onClick={() => handleStatusChange(lead._id, nextAction.next)}
                                title={`Advance to ${STAGE_LABELS[nextAction.next]}`}
                              >
                                {nextAction.label}
                              </button>
                            )}
                          </div>

                          {/* Convert to client CTA */}
                          {stage !== 'converted' && stage !== 'lost' && (
                            <button
                              type="button"
                              className="kanban-convert"
                              onClick={() => handleConvert(lead._id)}
                            >
                              <Sparkles size={12} /> Convert to Client
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <AddLeadModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchLeads();
          }}
        />
      )}

      {/* View Lead Details Modal */}
      {selectedLead && (
        <ViewLeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    referralSource: 'booking_page',
    priority: 'medium',
    enquiryMessage: '',
  });
  const [busy, setBusy] = useState(false);
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await leadsApi.create(form);
      toast.success('Lead added to pipeline!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add lead');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New Lead</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              name="name"
              className="modal-input"
              placeholder="e.g. Sarah Jenkins"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              className="modal-input"
              placeholder="sarah@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              className="modal-input"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={handleChange}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Referral Source
              <select
                name="referralSource"
                className="modal-input"
                value={form.referralSource}
                onChange={handleChange}
              >
                <option value="booking_page">Booking Page</option>
                <option value="therapist_website">Website</option>
                <option value="referral">Referral</option>
                <option value="google">Google</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Priority
              <select
                name="priority"
                className="modal-input"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label>
            Enquiry Notes
            <textarea
              name="enquiryMessage"
              className="modal-input"
              rows={3}
              placeholder="Initial message or requirements..."
              value={form.enquiryMessage}
              onChange={handleChange}
            />
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewLeadModal({ lead, onClose, onStatusChange, onConvert }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>{lead.name}</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Added {lead.createdAt ? format(new Date(lead.createdAt), 'MMM d, yyyy') : 'recently'}
            </span>
          </div>
          <span className={`kanban-priority-pill priority-${lead.priority || 'medium'}`}>
            {lead.priority || 'medium'} priority
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</span>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {lead.email || '—'}
              </p>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</span>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-primary)' }}>
                {lead.phone || '—'}
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Pipeline Stage</span>
            <div style={{ marginTop: 8 }}>
              <select
                value={lead.status}
                onChange={(e) => {
                  onStatusChange(lead._id, e.target.value);
                  onClose();
                }}
                className="modal-input"
                style={{ width: '100%' }}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {lead.enquiryMessage && (
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enquiry Message</span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {lead.enquiryMessage}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {lead.status !== 'converted' && lead.status !== 'lost' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onConvert(lead._id);
                onClose();
              }}
            >
              <Sparkles size={14} /> Convert to Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
