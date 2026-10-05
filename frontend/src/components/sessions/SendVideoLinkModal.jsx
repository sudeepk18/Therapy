import React, { useState, useEffect } from 'react';
import { Video, X, Sparkles, Copy, ExternalLink, Send, Check } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { sessionsApi } from '../../api/sessions.api';

export default function SendVideoLinkModal({ session, isOpen, onClose, onSuccess }) {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      setMeetingUrl(session.meetingLink || session.videoCall?.joinUrl || '');
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  const clientName = session.clientId?.name || 'Client';
  const scheduledTime = session.scheduledAt ? new Date(session.scheduledAt) : new Date();
  const timeDiffHours = (scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isStartingSoon = timeDiffHours > 0 && timeDiffHours <= 1;

  const handleGenerateInstant = () => {
    const roomSuffix = (session._id || Math.random().toString(36).substring(2, 9)).slice(-8);
    const instantUrl = `https://meet.jit.si/unfazed-therapy-${roomSuffix}`;
    setMeetingUrl(instantUrl);
    toast.success('Instant secure video room generated! Click "Send Link" to notify client.');
  };

  const handleCopy = () => {
    if (!meetingUrl) return;
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!meetingUrl.trim()) {
      toast.error('Please enter or generate a video meeting link');
      return;
    }

    setSaving(true);
    try {
      const res = await sessionsApi.updateMeetingLink(session._id, meetingUrl.trim());
      toast.success('Video link sent to client dashboard!');
      if (onSuccess) onSuccess(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save meeting link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          background: 'var(--bg-card, #0F172A)',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid var(--border, #1E293B)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border, #1E293B)',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(20, 184, 166, 0.12)',
                color: 'var(--teal, #14b8a6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Video size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
                Send Online Video Session Link
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary, #94A3B8)' }}>
                Instantly shares the video room with client dashboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748B)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Session Summary Card */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid var(--border, #1E293B)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>Client</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}>
                {clientName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>Appointment Time</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--teal, #14b8a6)' }}>
                {session.scheduledAt ? format(scheduledTime, 'dd MMM yyyy, h:mm a') : '—'}
              </span>
            </div>
          </div>

          {/* 1-Hour Alert banner if within 1 hour */}
          {isStartingSoon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 8,
                fontSize: 12,
                color: '#f59e0b',
                fontWeight: 500,
              }}
            >
              <span>⚡</span>
              <span>
                <strong>Session starts within 1 hour!</strong> Send the link now so the client can prepare and join from their dashboard.
              </span>
            </div>
          )}

          {/* Meeting URL input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label
                htmlFor="video-link-input"
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #F8FAFC)' }}
              >
                Video Session Meeting URL
              </label>
              <button
                type="button"
                onClick={handleGenerateInstant}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 6,
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  background: 'rgba(20, 184, 166, 0.08)',
                  color: 'var(--teal, #14b8a6)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Sparkles size={13} />
                Generate Instant Room
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                id="video-link-input"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="Paste Google Meet, Zoom, or Teams link..."
                required
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '11px 40px 11px 14px',
                  borderRadius: 9,
                  border: '1px solid var(--border, #1E293B)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#F8FAFC',
                  fontSize: 13.5,
                  outline: 'none',
                }}
              />
              {meetingUrl && (
                <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy URL"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copied ? 'var(--success, #22c55e)' : 'var(--text-muted, #64748B)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Preview link in new tab"
                    style={{
                      color: 'var(--text-muted, #64748B)',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-muted, #64748B)' }}>
              Supports Google Meet, Zoom, Teams, or free instant Jitsi rooms.
            </p>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--border, #1E293B)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9.5px 20px',
              }}
            >
              {saving ? 'Sending...' : (
                <>
                  <Send size={15} />
                  Send Link to Client Dashboard
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
