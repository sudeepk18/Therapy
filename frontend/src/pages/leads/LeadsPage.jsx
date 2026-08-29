import { useEffect, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
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

const STAGE_COLORS = {
  new:                    { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  contacted:              { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  consultation_scheduled: { color: 'var(--violet)',  bg: 'var(--violet-glow)'},
  in_discussion:          { color: 'var(--teal)',    bg: 'var(--teal-glow)'  },
  converted:              { color: 'var(--success)', bg: 'var(--success-bg)' },
  lost:                   { color: 'var(--danger)',  bg: 'var(--danger-bg)'  },
};

export default function LeadsPage() {
  const [leads,     setLeads]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadsApi.list({ limit: 50 });
      setLeads(res.data.data.leads || []);
    } catch { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, []);

  const grouped = STAGES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s);
    return acc;
  }, {});

  const handleConvert = async (id) => {
    try {
      await leadsApi.convert(id);
      toast.success('Lead converted to client!');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    }
  };

  return (
    <div className="page">
      <div className="page-toolbar">
        <p className="table-count">{leads.length} lead{leads.length !== 1 ? 's' : ''} in pipeline</p>
        <div style={{ flex: 1 }} />
        <button id="add-lead-btn" className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Lead
        </button>
      </div>

      {/* Kanban */}
      <div className="kanban-board">
        {STAGES.map((stage) => {
          const sc = STAGE_COLORS[stage];
          return (
            <div key={stage} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-stage" style={{ color: sc.color }}>{STAGE_LABELS[stage]}</span>
                <span className="kanban-count">{grouped[stage]?.length || 0}</span>
              </div>
              <div className="kanban-cards">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="kanban-card skeleton" style={{ height: 80 }} />
                    ))
                  : grouped[stage]?.map((lead) => (
                      <div key={lead._id} className="kanban-card">
                        <div className="kanban-card-top">
                          <p className="kanban-name">{lead.name}</p>
                          <span className="kanban-badge" style={{ color: sc.color, background: sc.bg }}>
                            {STAGE_LABELS[stage]}
                          </span>
                        </div>
                        <p className="kanban-email">{lead.email}</p>
                        {stage !== 'converted' && stage !== 'lost' && (
                          <button className="kanban-convert" onClick={() => handleConvert(lead._id)}>
                            Convert to Client
                          </button>
                        )}
                      </div>
                    ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <AddLeadModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchLeads(); }} />}
    </div>
  );
}

function AddLeadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', referralSource: 'other', priority: 'medium' });
  const [busy, setBusy] = useState(false);
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await leadsApi.create(form);
      toast.success('Lead added!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add lead');
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add New Lead</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Name<input name="name" className="modal-input" placeholder="Jane Smith" value={form.name} onChange={handleChange} required /></label>
          <label>Email<input name="email" type="email" className="modal-input" placeholder="jane@example.com" value={form.email} onChange={handleChange} required /></label>
          <label>Phone<input name="phone" className="modal-input" placeholder="+91 99999 99999" value={form.phone} onChange={handleChange} /></label>
          <label>Source
            <select name="referralSource" className="modal-input" value={form.referralSource} onChange={handleChange}>
              <option value="therapist_website">Website</option>
              <option value="referral">Referral</option>
              <option value="google">Google</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="booking_page">Booking Page</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>Priority
            <select name="priority" className="modal-input" value={form.priority} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
