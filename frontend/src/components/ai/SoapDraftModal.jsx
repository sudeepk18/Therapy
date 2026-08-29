/**
 * SoapDraftModal.jsx
 * Modal for generating and reviewing AI-generated SOAP note drafts.
 *
 * Key behaviors:
 * - Therapist enters free-text description
 * - AI generates S/O/A/P sections
 * - Therapist edits each section before accepting
 * - Clicking "Use Draft" returns the edited content to the parent
 * - NEVER auto-saves — parent is responsible for saving
 * - Disclaimer shown prominently at all times
 */

import { useState } from 'react';
import { X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { aiApi } from '../../api/ai.api';
import toast from 'react-hot-toast';
import './ai-insights.css';

export default function SoapDraftModal({ onClose, onAccept, noteId = null }) {
  const [freeText,   setFreeText]   = useState('');
  const [draft,      setDraft]      = useState(null);
  const [editedDraft, setEditedDraft] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState('input'); // 'input' | 'review'

  const handleGenerate = async () => {
    if (!freeText.trim() || freeText.trim().length < 10) {
      toast.error('Please describe the session (at least 10 characters)');
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.generateSoapDraft(freeText, noteId);
      const data = res.data.data;

      if (data.aiUnavailable) {
        toast.error('AI service is temporarily unavailable. Please try again shortly.');
        return;
      }

      const d = data.draft;
      setDraft(d);
      setEditedDraft({
        subjective: d.subjective,
        objective:  d.objective,
        assessment: d.assessment,
        plan:       d.plan,
      });
      setStep('review');
    } catch {
      toast.error('Failed to generate SOAP draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!editedDraft) return;
    onAccept(editedDraft);
    toast.success('SOAP draft applied — remember to review before saving.');
    onClose();
  };

  const handleReset = () => {
    setStep('input');
    setDraft(null);
    setEditedDraft(null);
  };

  return (
    <div className="soap-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="soap-modal">
        {/* Header */}
        <div className="soap-modal-header">
          <div>
            <div className="soap-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--teal)" />
              Generate SOAP Draft
              <span className="ai-badge">AI Draft</span>
            </div>
            <div className="soap-modal-warning">
              <AlertTriangle size={12} />
              AI Draft — Review and edit all sections before saving. NOT a clinical record.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="soap-modal-body">
          {step === 'input' && (
            <div className="soap-input-group">
              <label className="soap-input-label">
                Describe what happened in the session
              </label>
              <textarea
                className="soap-textarea free-text"
                placeholder="E.g. Client reported feeling anxious about upcoming work deadlines. Appeared calm and engaged during session. Explored CBT techniques for managing work stress. Plan to practice relaxation exercises daily and follow up next week."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                disabled={loading}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {freeText.length} characters · min 10 required
              </p>
            </div>
          )}

          {step === 'review' && editedDraft && (
            <>
              <div style={{
                padding: '8px 12px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--warning)',
                display: 'flex',
                gap: 6,
                alignItems: 'flex-start',
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                {draft?.disclaimer}
              </div>

              {['subjective', 'objective', 'assessment', 'plan'].map((section) => (
                <div className="soap-input-group" key={section}>
                  <label className="soap-input-label ai-generated">
                    ✨ {section.charAt(0).toUpperCase() + section.slice(1)}
                  </label>
                  <textarea
                    className="soap-textarea"
                    value={editedDraft[section]}
                    onChange={(e) => setEditedDraft(prev => ({ ...prev, [section]: e.target.value }))}
                    rows={3}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="soap-modal-footer">
          <p className="ai-disclaimer" style={{ border: 'none', padding: 0, flex: 1 }}>
            AI outputs are generated from keyword patterns in your input.
            Always verify clinical accuracy before saving.
          </p>
          <div className="soap-modal-actions">
            {step === 'review' && (
              <button className="soap-btn secondary" onClick={handleReset}>
                <RefreshCw size={13} /> Start over
              </button>
            )}
            <button className="soap-btn secondary" onClick={onClose}>
              Cancel
            </button>
            {step === 'input' ? (
              <button
                className="soap-btn primary"
                onClick={handleGenerate}
                disabled={loading || freeText.trim().length < 10}
              >
                {loading ? (
                  <>
                    <span className="ai-loading-dot" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    Generate Draft
                  </>
                )}
              </button>
            ) : (
              <button className="soap-btn primary" onClick={handleAccept}>
                ✓ Use Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
