import React, { useState } from 'react';
import {
  X, Calendar, Clock, Video, MapPin, Check, AlertCircle,
  Sparkles, CheckCircle2, User, Phone, Mail, FileText, Loader2,
  Bell, CheckCheck, Trash2, ArrowUpRight, ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads.api';
import './BookingRequestsDrawer.css';

export default function BookingRequestsDrawer({
  isOpen,
  onClose,
  requests = [],
  loading = false,
  onHandled,
  reminders = [],
  unreadRemindersCount = 0,
  onMarkReminderRead,
  onMarkAllRemindersRead,
  onDeleteReminder,
}) {
  const [processingId, setProcessingId] = useState(null);
  const [decliningId,  setDecliningId]  = useState(null);
  const [activeTab,    setActiveTab]    = useState(unreadRemindersCount > 0 ? 'reminders' : 'requests');

  if (!isOpen) return null;

  const handleAccept = async (lead) => {
    try {
      setProcessingId(lead._id);
      await leadsApi.acceptAppointment(lead._id);
      toast.success(`Confirmed! Appointment with ${lead.name} scheduled & slot closed.`);
      window.dispatchEvent(new CustomEvent('appointment-updated', { detail: { leadId: lead._id, action: 'accepted' } }));
      if (onHandled) onHandled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept appointment request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (lead) => {
    if (!window.confirm(`Decline appointment request from ${lead.name}?`)) return;
    try {
      setDecliningId(lead._id);
      await leadsApi.rejectAppointment(lead._id);
      toast.success(`Declined booking request from ${lead.name}`);
      window.dispatchEvent(new CustomEvent('appointment-updated', { detail: { leadId: lead._id, action: 'rejected' } }));
      if (onHandled) onHandled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline request');
    } finally {
      setDecliningId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="booking-requests-drawer" aria-label="Notifications and Requests Panel">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-area">
            <div className="drawer-title-row">
              <h2 className="drawer-title">Notifications &amp; Activity</h2>
            </div>
            <p className="drawer-subtitle">
              Session countdown reminders and client enquiries
            </p>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab ${activeTab === 'reminders' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            <Bell size={14} />
            <span>Session Reminders</span>
            {unreadRemindersCount > 0 && (
              <span className="drawer-tab-badge drawer-tab-badge--teal">
                {unreadRemindersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`drawer-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <Calendar size={14} />
            <span>Booking Requests</span>
            {pendingCount > 0 && (
              <span className="drawer-tab-badge drawer-tab-badge--amber">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content">
          {activeTab === 'reminders' ? (
            /* ────────────────────────────────────────────────────────── */
            /* Tab: Session Reminders                                     */
            /* ────────────────────────────────────────────────────────── */
            <div>
              {reminders.length > 0 && (
                <div className="drawer-section-toolbar">
                  <span className="drawer-section-title">
                    {unreadRemindersCount > 0
                      ? `${unreadRemindersCount} unread reminder${unreadRemindersCount > 1 ? 's' : ''}`
                      : 'All caught up'}
                  </span>
                  {unreadRemindersCount > 0 && (
                    <button
                      type="button"
                      className="drawer-action-link"
                      onClick={onMarkAllRemindersRead}
                    >
                      <CheckCheck size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Mark all as read
                    </button>
                  )}
                </div>
              )}

              {reminders.length === 0 ? (
                <div className="drawer-empty-state">
                  <div className="empty-icon-circle">
                    <CheckCircle2 size={30} className="empty-icon" />
                  </div>
                  <h3 className="empty-title">No Active Reminders</h3>
                  <p className="empty-description">
                    You're all set! You'll receive automated alerts here on the day of your sessions, 1 hour before, and 5 minutes before they begin.
                  </p>
                </div>
              ) : (
                <div className="reminders-list">
                  {reminders.map((item) => {
                    const isUrgent = item.subType === 'five_minutes';
                    const isOneHour = item.subType === 'one_hour';
                    const isDayOf = item.subType === 'day_of';

                    let pillClass = 'milestone-day-of';
                    let pillLabel = 'Today';
                    if (isUrgent) {
                      pillClass = 'milestone-five-minutes';
                      pillLabel = 'Starts in 5 min!';
                    } else if (isOneHour) {
                      pillClass = 'milestone-one-hour';
                      pillLabel = 'In 1 Hour';
                    }

                    return (
                      <div
                        key={item._id}
                        className={`reminder-card ${!item.isRead ? 'unread' : ''}`}
                      >
                        <div className="reminder-card-top">
                          <span className={`reminder-milestone-pill ${pillClass}`}>
                            <Clock size={11} /> {pillLabel}
                          </span>
                          <span className="reminder-time-ago">
                            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ''}
                          </span>
                        </div>

                        <h4 className="reminder-title">{item.title}</h4>
                        <p className="reminder-message">{item.message}</p>

                        <div className="reminder-actions">
                          {/* Join Video or View Session */}
                          {item.sessionId?.meetingLink ? (
                            <a
                              href={item.sessionId.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="reminder-btn-join"
                              onClick={() => onMarkReminderRead && onMarkReminderRead(item._id)}
                            >
                              <Video size={13} /> Join Room
                            </a>
                          ) : item.sessionId?._id ? (
                            <Link
                              to="/therapist/schedule"
                              className="reminder-btn-join"
                              onClick={() => {
                                if (onMarkReminderRead) onMarkReminderRead(item._id);
                                onClose();
                              }}
                            >
                              <Video size={13} /> Open Session
                            </Link>
                          ) : null}

                          {/* Client Notes link */}
                          {item.clientId && (
                            <Link
                              to={`/therapist/clients/${item.clientId._id || item.clientId}`}
                              className="reminder-btn-action"
                              onClick={() => {
                                if (onMarkReminderRead) onMarkReminderRead(item._id);
                                onClose();
                              }}
                            >
                              <FileText size={12} /> Notes
                            </Link>
                          )}

                          {/* Mark Read Toggle */}
                          {!item.isRead && (
                            <button
                              type="button"
                              className="reminder-btn-action"
                              onClick={() => onMarkReminderRead && onMarkReminderRead(item._id)}
                              title="Mark as read"
                            >
                              <Check size={12} /> Read
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            className="reminder-btn-dismiss"
                            onClick={() => onDeleteReminder && onDeleteReminder(item._id)}
                            title="Dismiss reminder"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ────────────────────────────────────────────────────────── */
            /* Tab: Booking Requests                                      */
            /* ────────────────────────────────────────────────────────── */
            <div>
              {loading ? (
                <div className="drawer-loading">
                  <Loader2 size={28} className="spinner-icon" />
                  <p>Checking incoming booking requests...</p>
                </div>
              ) : pendingCount === 0 ? (
                <div className="drawer-empty-state">
                  <div className="empty-icon-circle">
                    <CheckCircle2 size={32} className="empty-icon" />
                  </div>
                  <h3 className="empty-title">All Caught Up</h3>
                  <p className="empty-description">
                    There are no pending booking requests right now. New consultation requests from your booking page will appear here.
                  </p>
                </div>
              ) : (
                <div className="drawer-requests-list">
                  {requests.map((lead) => {
                    const booking = lead.bookingDetails || {};
                    const isProcessing = processingId === lead._id;
                    const isDeclining = decliningId === lead._id;

                    const dateStr = booking.scheduledAt
                      ? format(new Date(booking.scheduledAt), 'EEEE, MMMM d, yyyy')
                      : 'Date not specified';
                    const timeStr = booking.timeSlot || 'Time not specified';

                    return (
                      <div key={lead._id} className="booking-request-card">
                        <div className="request-card-header">
                          <div className="client-identity">
                            <div className="client-avatar">
                              {lead.name ? lead.name.slice(0, 2).toUpperCase() : 'CL'}
                            </div>
                            <div>
                              <p className="client-name">{lead.name}</p>
                              <span className="request-pill-status">Pending Confirmation</span>
                            </div>
                          </div>
                        </div>

                        <div className="request-timing-box">
                          <div className="timing-row">
                            <Calendar size={14} className="timing-icon" />
                            <span className="timing-date">{dateStr}</span>
                          </div>
                          <div className="timing-row">
                            <Clock size={14} className="timing-icon" />
                            <span className="timing-time">{timeStr}</span>
                          </div>
                        </div>

                        <div className="request-meta-chips">
                          <span className="request-meta-chip">
                            <Video size={11} />
                            <span className="capitalize">{booking.medium || 'video'} Session</span>
                          </span>
                          <span className="request-meta-chip">
                            <Clock size={11} />
                            <span>{booking.durationMinutes || 50} mins</span>
                          </span>
                        </div>

                        <div className="request-actions">
                          <button
                            type="button"
                            className="btn-request-accept"
                            onClick={() => handleAccept(lead)}
                            disabled={isProcessing || isDeclining}
                          >
                            {isProcessing ? (
                              <Loader2 size={13} className="btn-spinner" />
                            ) : (
                              <Check size={13} />
                            )}
                            {isProcessing ? 'Confirming…' : 'Accept & Add to Calendar'}
                          </button>

                          <button
                            type="button"
                            className="btn-request-decline"
                            onClick={() => handleDecline(lead)}
                            disabled={isProcessing || isDeclining}
                          >
                            {isDeclining ? <Loader2 size={13} className="btn-spinner" /> : 'Decline'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          <p className="drawer-footer-note">
            💡 Reminders automatically trigger on the day of the session, 1 hour before, and 5 minutes before scheduled start time.
          </p>
        </div>
      </aside>
    </>
  );
}
