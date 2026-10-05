import React, { useState, useEffect } from 'react';
import { Video, Clock, X, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SessionReminderBanner({ reminders = [], onDismiss }) {
  const [dismissedIds, setDismissedIds] = useState([]);

  // Find the most urgent unread reminder (5 minutes or 1 hour)
  const urgentReminder = reminders.find(
    (r) =>
      !r.isRead &&
      !dismissedIds.includes(r._id) &&
      (r.subType === 'five_minutes' || r.subType === 'one_hour')
  );

  if (!urgentReminder) return null;

  const isFiveMin = urgentReminder.subType === 'five_minutes';

  const handleDismiss = () => {
    setDismissedIds((prev) => [...prev, urgentReminder._id]);
    if (onDismiss) onDismiss(urgentReminder._id);
  };

  return (
    <div
      style={{
        background: isFiveMin
          ? 'linear-gradient(90deg, rgba(244, 63, 94, 0.16) 0%, rgba(6, 182, 212, 0.16) 100%)'
          : 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        borderBottom: `1px solid ${isFiveMin ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.3)'}`,
        backdropFilter: 'blur(10px)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 900,
        position: 'sticky',
        top: 0,
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: isFiveMin ? '#F43F5E' : '#F59E0B',
            color: '#FFFFFF',
            boxShadow: isFiveMin ? '0 0 12px rgba(244, 63, 94, 0.5)' : 'none',
          }}
        >
          <Clock size={12} />
          {isFiveMin ? 'Starts in 5 min' : 'In 1 hour'}
        </span>

        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          <strong>{urgentReminder.title}:</strong> {urgentReminder.message}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {urgentReminder.sessionId?.meetingLink ? (
          <a
            href={urgentReminder.sessionId.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 8,
              height: 'auto',
            }}
          >
            <Video size={13} /> Join Room
          </a>
        ) : (
          <Link
            to="/therapist/schedule"
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 8,
              height: 'auto',
            }}
          >
            <Video size={13} /> Open Session
          </Link>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
          title="Dismiss reminder"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
