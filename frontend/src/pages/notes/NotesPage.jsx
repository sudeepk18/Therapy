import { useEffect, useState } from 'react';
import { Plus, FileText, Lock, CheckCircle, Share2, Shield, Eye, Trash2, Sparkles, Activity } from 'lucide-react';
import { notesApi } from '../../api/notes.api';
import { clientsApi } from '../../api/clients.api';
import { sessionsApi } from '../../api/sessions.api';
import { aiApi } from '../../api/ai.api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import SoapDraftModal from '../../components/ai/SoapDraftModal';
import EngagementTrendChart from '../../components/ai/EngagementTrendChart';
import '../clients/ClientsPage.css';
import './NotesPage.css';

const NOTE_STATUS_BADGE = {
  draft:     { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  finalized: { color: 'var(--info)',    bg: 'var(--info-bg)'    },
  signed:    { color: 'var(--success)', bg: 'var(--success-bg)' },
};

const SENTIMENT_BADGE = {
  POSITIVE: { color: 'var(--success)', bg: 'var(--success-bg)', icon: '🟢' },
  NEUTRAL:  { color: 'var(--info)',    bg: 'var(--info-bg)',    icon: '🟡' },
  NEGATIVE: { color: 'var(--danger)',  bg: 'var(--danger-bg)',  icon: '🔴' },
};

export default function NotesPage() {
  const [notes,      setNotes]      = useState([]);
  const [clients,    setClients]    = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [activeNote, setActiveNote] = useState(null); // for viewing/editing
  const [engagementTrend, setEngagementTrend] = useState(null);
  const [showEngagement, setShowEngagement]   = useState(false);

  useEffect(() => {
    clientsApi.list({ limit: 100, status: 'active' }).then((res) => {
      const cls = res.data.data.clients || [];
      setClients(cls);
      if (cls.length > 0) {
        setSelectedClient(cls[0]._id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchEngagement = async (clientId) => {
    if (!clientId) return;
    try {
      const res = await aiApi.getClientEngagement(clientId);
      if (res.data?.data && !res.data.data.aiUnavailable) {
        setEngagementTrend(res.data.data.trend || []);
      }
    } catch {
      // Non-critical
    }
  };

  const fetchNotes = async (clientId) => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await notesApi.getByClient(clientId);
      setNotes(res.data.data.notes || []);
      fetchEngagement(clientId);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClient) {
      fetchNotes(selectedClient);
    }
  }, [selectedClient]);

  const handleFinalize = async (noteId) => {
    try {
      await notesApi.finalize(noteId);
      toast.success('Note finalized');
      fetchNotes(selectedClient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalize');
    }
  };

  const handleSign = async (noteId) => {
    if (!window.confirm('Digitally sign this note? Signing locks the note from further modifications.')) return;
    try {
      await notesApi.sign(noteId);
      toast.success('Note signed and locked permanently');
      fetchNotes(selectedClient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign note');
    }
  };

  const handleToggleShare = async (noteId, currentShareState) => {
    try {
      await notesApi.toggleShare(noteId, !currentShareState);
      toast.success(!currentShareState ? 'Shared with Client Portal' : 'Unshared from Client Portal');
      fetchNotes(selectedClient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update share setting');
    }
  };

  const handleDeleteDraft = async (noteId) => {
    if (!window.confirm('Delete this draft note?')) return;
    try {
      await notesApi.delete(noteId);
      toast.success('Draft note deleted');
      fetchNotes(selectedClient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete note');
    }
  };

  const handleAnalyzeSentiment = async (noteId) => {
    try {
      const res = await aiApi.analyzeSentiment(noteId);
      if (res.data?.data?.aiUnavailable) {
        toast.error('AI service is temporarily unavailable');
        return;
      }
      toast.success('Sentiment analyzed successfully');
      fetchNotes(selectedClient);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to analyze sentiment');
    }
  };

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="page-toolbar">
        <div className="toolbar-filters">
          <select
            id="notes-client-filter"
            className="filter-select"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            {clients.length === 0 && <option value="">No clients</option>}
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                Client: {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        {engagementTrend && engagementTrend.length > 1 && (
          <button
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8 }}
            onClick={() => setShowEngagement(!showEngagement)}
          >
            <Activity size={14} color="var(--teal)" />
            {showEngagement ? 'Hide Trend' : 'Client Trend'}
          </button>
        )}
        <button
          id="new-note-btn"
          className="btn-primary"
          onClick={() => setShowModal(true)}
          disabled={!selectedClient}
        >
          <Plus size={15} /> New Session Note
        </button>
      </div>

      {/* Engagement Trend Panel */}
      {showEngagement && engagementTrend && engagementTrend.length > 1 && (
        <div className="dashboard-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} color="var(--teal)" />
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Client Session Sentiment &amp; Engagement Trend</h4>
              <span className="ai-badge">Therapist Only</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Linguistic pattern indicator · NOT a medical diagnosis
            </span>
          </div>
          <EngagementTrendChart trend={engagementTrend} loading={false} />
        </div>
      )}

      {/* Notes Grid */}
      <div className="notes-container">
        {loading ? (
          <div className="notes-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="note-card skeleton" style={{ height: 200 }} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="table-card">
            <div className="table-empty" style={{ padding: '60px 0' }}>
              <FileText size={36} />
              <p>No clinical session notes recorded for this client</p>
            </div>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => {
              const st = NOTE_STATUS_BADGE[note.status] || NOTE_STATUS_BADGE.draft;
              return (
                <div key={note._id} className="note-card">
                  <div className="note-card-header">
                    <div className="note-card-type-chip">
                      {note.noteType?.toUpperCase()}
                    </div>
                    <span className="status-badge" style={{ color: st.color, background: st.bg }}>
                      {note.status === 'signed' ? '🔒 Signed' : note.status}
                    </span>
                    {note.aiSentiment && (
                      <span
                        className="status-badge"
                        style={{
                          color: SENTIMENT_BADGE[note.aiSentiment.label]?.color || 'var(--text-secondary)',
                          background: SENTIMENT_BADGE[note.aiSentiment.label]?.bg || 'var(--bg-elevated)',
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title={`AI Sentiment: ${note.aiSentiment.score > 0 ? '+' : ''}${note.aiSentiment.score?.toFixed(2)}`}
                      >
                        {SENTIMENT_BADGE[note.aiSentiment.label]?.icon} {note.aiSentiment.label}
                      </span>
                    )}
                  </div>

                  <h4 className="note-card-title">{note.title}</h4>

                  <p className="note-card-date">
                    {format(new Date(note.createdAt), 'dd MMM yyyy, h:mm a')}
                  </p>

                  {/* Summary Preview */}
                  <div className="note-card-preview">
                    {note.noteType === 'soap' && (
                      <>
                        <p><strong>S:</strong> {note.soap?.subjective || 'N/A'}</p>
                        <p><strong>O:</strong> {note.soap?.objective || 'N/A'}</p>
                      </>
                    )}
                    {note.noteType === 'dap' && (
                      <>
                        <p><strong>D:</strong> {note.dap?.data || 'N/A'}</p>
                        <p><strong>A:</strong> {note.dap?.assessment || 'N/A'}</p>
                      </>
                    )}
                    {note.noteType === 'progress' && (
                      <p>{note.content || 'No summary content'}</p>
                    )}
                  </div>

                  {/* Digital Signature Hash if signed */}
                  {note.isSigned && note.signatureHash && (
                    <div className="note-signature-box">
                      <Shield size={12} color="var(--success)" />
                      <span>Hash: {note.signatureHash.substring(0, 16)}…</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="note-card-actions">
                    {note.status === 'draft' && (
                      <>
                        <button
                          className="note-action-btn note-action-btn--finalize"
                          onClick={() => handleFinalize(note._id)}
                        >
                          <CheckCircle size={13} /> Finalize
                        </button>
                        <button
                          className="note-action-btn note-action-btn--delete"
                          onClick={() => handleDeleteDraft(note._id)}
                          title="Delete Draft"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}

                    {note.status === 'finalized' && (
                      <button
                        className="note-action-btn note-action-btn--sign"
                        onClick={() => handleSign(note._id)}
                      >
                        <Lock size={13} /> Sign &amp; Lock
                      </button>
                    )}

                    {note.status !== 'draft' && (
                      <button
                        className={`note-action-btn ${note.isSharedWithClient ? 'note-action-btn--shared' : ''}`}
                        onClick={() => handleToggleShare(note._id, note.isSharedWithClient)}
                        title="Toggle sharing with client portal"
                      >
                        <Share2 size={13} /> {note.isSharedWithClient ? 'Shared' : 'Share Portal'}
                      </button>
                    )}

                    {!note.aiSentiment && (
                      <button
                        className="note-action-btn"
                        onClick={() => handleAnalyzeSentiment(note._id)}
                        title="Analyze session linguistic sentiment"
                      >
                        <Sparkles size={13} color="var(--teal)" /> AI Sentiment
                      </button>
                    )}

                    <button
                      className="note-action-btn"
                      onClick={() => setActiveNote(note)}
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <CreateNoteModal
          clientId={selectedClient}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchNotes(selectedClient);
          }}
        />
      )}

      {activeNote && (
        <ViewNoteModal note={activeNote} onClose={() => setActiveNote(null)} />
      )}
    </div>
  );
}

function CreateNoteModal({ clientId, onClose, onSuccess }) {
  const [sessions, setSessions] = useState([]);
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [form, setForm]         = useState({
    sessionId: '',
    noteType: 'soap',
    title: '',
    soap: { subjective: '', objective: '', assessment: '', plan: '' },
    dap: { data: '', assessment: '', plan: '' },
    content: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    sessionsApi.list({ clientId, limit: 30 }).then((res) => {
      const sess = res.data.data.sessions || [];
      setSessions(sess);
      if (sess.length > 0) {
        setForm((f) => ({ ...f, sessionId: sess[0]._id }));
      }
    });
  }, [clientId]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSoapChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, soap: { ...f.soap, [name]: value } }));
  };

  const handleDapChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, dap: { ...f.dap, [name]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sessionId) {
      toast.error('Please select a session to attach this note to');
      return;
    }
    setBusy(true);
    try {
      await notesApi.create({
        ...form,
        clientId,
      });
      toast.success('Clinical session note saved as draft!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">New Clinical Session Note</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Attached Session
              <select
                name="sessionId"
                className="modal-input"
                value={form.sessionId}
                onChange={handleChange}
                required
              >
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {format(new Date(s.scheduledAt), 'dd MMM yyyy')} ({s.sessionType})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Note Format
              <select
                name="noteType"
                className="modal-input"
                value={form.noteType}
                onChange={handleChange}
              >
                <option value="soap">SOAP Note</option>
                <option value="dap">DAP Note</option>
                <option value="progress">Progress Note</option>
              </select>
            </label>
          </div>

          <label>
            Note Title (Optional)
            <input
              name="title"
              className="modal-input"
              placeholder="e.g. CBT Session #4 — Anxiety Management"
              value={form.title}
              onChange={handleChange}
            />
          </label>

          {/* SOAP Format */}
          {form.noteType === 'soap' && (
            <div className="note-format-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>SOAP Clinical Sections</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderColor: 'var(--teal)',
                    color: 'var(--teal)',
                    background: 'rgba(20,184,166,0.08)'
                  }}
                  onClick={() => setShowAiDraftModal(true)}
                >
                  <Sparkles size={13} />
                  ✨ Generate with AI Draft
                </button>
              </div>
              <label>
                Subjective (S)
                <textarea
                  name="subjective"
                  className="modal-input"
                  rows={2}
                  placeholder="Client's self-reported feelings, quotes, symptoms…"
                  value={form.soap.subjective}
                  onChange={handleSoapChange}
                />
              </label>
              <label>
                Objective (O)
                <textarea
                  name="objective"
                  className="modal-input"
                  rows={2}
                  placeholder="Therapist's observations, affect, appearance, test results…"
                  value={form.soap.objective}
                  onChange={handleSoapChange}
                />
              </label>
              <label>
                Assessment (A)
                <textarea
                  name="assessment"
                  className="modal-input"
                  rows={2}
                  placeholder="Clinical evaluation, progress toward goals, diagnostic impressions…"
                  value={form.soap.assessment}
                  onChange={handleSoapChange}
                />
              </label>
              <label>
                Plan (P)
                <textarea
                  name="plan"
                  className="modal-input"
                  rows={2}
                  placeholder="Interventions planned, homework assigned, next appointment…"
                  value={form.soap.plan}
                  onChange={handleSoapChange}
                />
              </label>
            </div>
          )}

          {/* DAP Format */}
          {form.noteType === 'dap' && (
            <div className="note-format-box">
              <label>
                Data (D)
                <textarea
                  name="data"
                  className="modal-input"
                  rows={3}
                  placeholder="Subjective and objective observations during session…"
                  value={form.dap.data}
                  onChange={handleDapChange}
                />
              </label>
              <label>
                Assessment (A)
                <textarea
                  name="assessment"
                  className="modal-input"
                  rows={3}
                  placeholder="Therapist's clinical evaluation of client state…"
                  value={form.dap.assessment}
                  onChange={handleDapChange}
                />
              </label>
              <label>
                Plan (P)
                <textarea
                  name="plan"
                  className="modal-input"
                  rows={3}
                  placeholder="Treatment plan, homework, next steps…"
                  value={form.dap.plan}
                  onChange={handleDapChange}
                />
              </label>
            </div>
          )}

          {/* General Progress Note */}
          {form.noteType === 'progress' && (
            <label>
              Session Summary &amp; Progress
              <textarea
                name="content"
                className="modal-input"
                rows={6}
                placeholder="Write full session details and progress notes…"
                value={form.content}
                onChange={handleChange}
              />
            </label>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving Draft…' : 'Save as Draft'}
            </button>
          </div>
        </form>

        {showAiDraftModal && (
          <SoapDraftModal
            onClose={() => setShowAiDraftModal(false)}
            onAccept={(draft) => {
              setForm((prev) => ({
                ...prev,
                soap: {
                  subjective: draft.subjective || '',
                  objective:  draft.objective || '',
                  assessment: draft.assessment || '',
                  plan:       draft.plan || '',
                },
              }));
            }}
          />
        )}
      </div>
    </div>
  );
}

function ViewNoteModal({ note, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{note.title}</h3>
          <span className="status-badge" style={{ color: 'var(--teal)', background: 'var(--teal-glow)' }}>
            {note.noteType?.toUpperCase()}
          </span>
        </div>

        <div className="view-note-body">
          {note.noteType === 'soap' && (
            <>
              <div className="note-section">
                <h5>Subjective (S)</h5>
                <p>{note.soap?.subjective || 'None'}</p>
              </div>
              <div className="note-section">
                <h5>Objective (O)</h5>
                <p>{note.soap?.objective || 'None'}</p>
              </div>
              <div className="note-section">
                <h5>Assessment (A)</h5>
                <p>{note.soap?.assessment || 'None'}</p>
              </div>
              <div className="note-section">
                <h5>Plan (P)</h5>
                <p>{note.soap?.plan || 'None'}</p>
              </div>
            </>
          )}

          {note.noteType === 'dap' && (
            <>
              <div className="note-section">
                <h5>Data (D)</h5>
                <p>{note.dap?.data || 'None'}</p>
              </div>
              <div className="note-section">
                <h5>Assessment (A)</h5>
                <p>{note.dap?.assessment || 'None'}</p>
              </div>
              <div className="note-section">
                <h5>Plan (P)</h5>
                <p>{note.dap?.plan || 'None'}</p>
              </div>
            </>
          )}

          {note.noteType === 'progress' && (
            <div className="note-section">
              <h5>Session Content</h5>
              <p>{note.content || 'No content recorded'}</p>
            </div>
          )}

          {note.signatureHash && (
            <div className="note-section note-section--signature">
              <h5>🔒 Digital Signature Hash (Tamper-Evident)</h5>
              <code>{note.signatureHash}</code>
              <p className="sig-date">Signed on {format(new Date(note.signedAt), 'dd MMM yyyy, h:mm:ss a')}</p>
            </div>
          )}

          {note.aiSentiment && (
            <div className="note-section" style={{ borderLeft: '3px solid var(--teal)', background: 'rgba(20,184,166,0.05)', padding: '12px 14px', borderRadius: '0 8px 8px 0' }}>
              <h5 style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal)', margin: '0 0 6px 0' }}>
                <Sparkles size={14} /> AI Sentiment &amp; Engagement Indicator
              </h5>
              <p style={{ margin: '0 0 4px 0', fontSize: 13 }}>
                Linguistic Sentiment: <strong>{note.aiSentiment.label}</strong> (Score: {note.aiSentiment.score > 0 ? '+' : ''}{note.aiSentiment.score?.toFixed(2)})
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                Therapist-only indicator — derived from note text patterns. NOT a medical or clinical diagnosis.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
