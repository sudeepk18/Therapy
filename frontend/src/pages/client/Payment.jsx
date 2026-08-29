import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Video, MapPin, Mail, Shield } from 'lucide-react';
import { format } from 'date-fns';
import './Payment.css';

/**
 * Payment — booking confirmation page.
 * Accessible at: /client/:slug/payment
 * No auth required — receives booking data via router state.
 */
export default function Payment() {
  const { slug }   = useParams();
  const { state }  = useLocation();

  // If navigated directly (no booking data), show a generic confirmation
  const form      = state?.form;
  const therapist = state?.therapist;

  if (!form) {
    return (
      <div className="payment-page">
        <div className="payment-success-card">
          <div className="payment-check-icon">
            <CheckCircle size={40} color="#14B8A6" />
          </div>
          <h2 className="payment-title">Booking Request Received</h2>
          <p className="payment-sub">
            Your therapist will confirm your session shortly. Check your email for details.
          </p>
          <Link to={`/client/${slug}`} className="payment-back-btn">
            ← Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  const sessionType = form.sessionType?.replace(/_/g, ' ');
  const scheduledAt = form.scheduledAt
    ? format(new Date(form.scheduledAt), 'EEEE, dd MMM yyyy \'at\' h:mm a')
    : 'Date to be confirmed';

  return (
    <div className="payment-page" style={{ animation: 'fadeIn 0.25s ease' }}>
      <div className="payment-success-card">
        {/* Icon */}
        <div className="payment-check-icon">
          <CheckCircle size={48} color="#14B8A6" />
        </div>

        <h2 className="payment-title">Booking Request Sent!</h2>
        <p className="payment-sub">
          Hi <strong>{form.clientName}</strong>, your session request has been submitted.
          {therapist?.name && <> <strong>{therapist.name}</strong> will confirm shortly.</>}
        </p>

        {/* Summary */}
        <div className="payment-summary">
          <div className="payment-summary-row">
            <Calendar size={14} />
            <span>{scheduledAt}</span>
          </div>
          <div className="payment-summary-row">
            <Clock size={14} />
            <span style={{ textTransform: 'capitalize' }}>{sessionType} session</span>
          </div>
          <div className="payment-summary-row">
            {form.medium === 'online' ? <Video size={14} /> : <MapPin size={14} />}
            <span style={{ textTransform: 'capitalize' }}>{form.medium}</span>
          </div>
          <div className="payment-summary-row">
            <Mail size={14} />
            <span>Confirmation will be sent to <strong>{form.clientEmail}</strong></span>
          </div>
        </div>

        {/* What happens next */}
        <div className="payment-next-steps">
          <h4 className="payment-next-title">What happens next?</h4>
          <ol className="payment-steps-list">
            <li>Your therapist reviews your booking request</li>
            <li>You receive a confirmation email with session details</li>
            {form.medium === 'online' && <li>A secure video link will be sent before your session</li>}
            <li>If you have questions, reply to the confirmation email</li>
          </ol>
        </div>

        {/* Trust */}
        <div className="payment-trust">
          <Shield size={13} color="var(--teal)" />
          <span>Your personal information is kept 100% confidential and secure.</span>
        </div>

        {/* Actions */}
        <div className="payment-actions">
          <Link to={`/client/${slug}`} className="payment-back-btn">
            ← Back to Profile
          </Link>
          <Link to={`/client/${slug}/booking`} className="payment-book-another-btn">
            Book Another Session
          </Link>
        </div>
      </div>
    </div>
  );
}
