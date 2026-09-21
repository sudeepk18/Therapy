import React, { useState } from 'react';
import {
  X, Calendar, Clock, Video, MapPin, Check, AlertCircle,
  Sparkles, CheckCircle2, User, Phone, Mail, FileText, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { leadsApi } from '../../api/leads.api';
import './BookingRequestsDrawer.css';

export default function BookingRequestsDrawer({
  isOpen,
  onClose,
  requests = [],
  loading = false,
  onHandled,
}) {
  const [processingId, setProcessingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

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
      <aside className="booking-requests-drawer" aria-label="Booking Requests Panel">
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-area">
            <div className="drawer-title-row">
              <h2 className="drawer-title">Booking Requests</h2>
              {pendingCount > 0 && (
                <span className="drawer-badge-count">
                  {pendingCount} {pendingCount === 1 ? 'Pending' : 'Pending'}
                </span>
              )}
            </div>
            <p className="drawer-subtitle">
              Client requests awaiting your confirmation
            </p>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content">
          {loading ? (
            <div className="drawer-loading">
              <Loader2 className="spinner-icon" size={32} />
              <p>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="empty-icon-circle">
                <CheckCircle2 size={36} className="empty-icon" />
              </div>
              <h3 className="empty-title">All caught up!</h3>
              <p className="empty-description">
                You have no pending appointment requests at this moment. New requests from your public booking portal will appear right here.
              </p>
            </div>
          ) : (
            <div className="drawer-requests-list">
              {requests.map((lead) => {
                const b = lead.bookingDetails || {};
                const isAccepting = processingId === lead._id;
                const isDeclining = decliningId === lead._id;
                const isBusy = isAccepting || isDeclining;

                let dateDisplay = 'Date not specified';
                let timeDisplay = '';
                if (b.scheduledAt) {
                  try {
                    const dateObj = new Date(b.scheduledAt);
                    dateDisplay = format(dateObj, 'EEEE, dd MMM yyyy');
                    timeDisplay = `${format(dateObj, 'hh:mm a')} (${b.durationMinutes || 50} min)`;
                  } catch (e) {
                    dateDisplay = String(b.scheduledAt);
                  }
                }

                return (
                  <div key={lead._id} className="booking-request-card">
                    {/* Top Row: Name & tag */}
                    <div className="request-card-header">
                      <div className="client-identity">
                        <div className="client-avatar">
                          {lead.name ? lead.name[0].toUpperCase() : 'C'}
                        </div>
                        <div>
                          <h4 className="client-name">{lead.name}</h4>
                          <span className="request-pill-status">Awaiting Approval</span>
                        </div>
                      </div>
                    </div>

                    {/* Time & Date Highlight */}
                    <div className="request-timing-box">
                      <div className="timing-row">
                        <Calendar size={15} className="timing-icon" />
                        <span className="timing-date">{dateDisplay}</span>
                      </div>
                      {timeDisplay && (
                        <div className="timing-row">
                          <Clock size={15} className="timing-icon" />
                          <span className="timing-time">{timeDisplay}</span>
                        </div>
                      )}
                    </div>

                    {/* Modality Chips */}
                    <div className="request-meta-chips">
                      <span className="request-meta-chip">
                        {b.medium === 'in-person' ? <MapPin size={13} /> : <Video size={13} />}
                        <span className="capitalize">{b.medium || 'video'}</span>
                      </span>
                      <span className="request-meta-chip">
                        <span className="capitalize">{b.sessionType || 'individual'} Session</span>
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="request-contact-list">
                      <a href={`mailto:${lead.email}`} className="contact-item">
                        <Mail size={13} />
                        <span>{lead.email}</span>
                      </a>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="contact-item">
                          <Phone size={13} />
                          <span>{lead.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Notes if any */}
                    {b.notes && (
                      <div className="request-notes-box">
                        <FileText size={13} className="notes-icon" />
                        <p className="request-notes-text">"{b.notes}"</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="request-actions">
                      <button
                        className="btn-request-accept"
                        onClick={() => handleAccept(lead)}
                        disabled={isBusy}
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 size={16} className="btn-spinner" />
                            <span>Confirming...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Accept &amp; Schedule</span>
                          </>
                        )}
                      </button>

                      <button
                        className="btn-request-decline"
                        onClick={() => handleDecline(lead)}
                        disabled={isBusy}
                      >
                        {isDeclining ? (
                          <Loader2 size={14} className="btn-spinner" />
                        ) : (
                          <span>Decline</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer Notice */}
        <div className="drawer-footer">
          <p className="drawer-footer-note">
            💡 Approving automatically adds the appointment to your schedule and closes the chosen time slot to prevent double-bookings.
          </p>
        </div>
      </aside>
    </>
  );
}
