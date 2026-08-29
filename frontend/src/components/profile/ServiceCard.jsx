import { Link } from 'react-router-dom';
import { Clock, Video, MapPin, ArrowRight } from 'lucide-react';

export default function ServiceCard({ title, duration, mode, description, price, bookingUrl }) {
  return (
    <div className="cp-info-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
          {price && (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--teal)' }}>
              ₹{price}
            </span>
          )}
        </div>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {duration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} />
              <span>{duration} mins</span>
            </div>
          )}
          {mode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {mode.toLowerCase().includes('video') || mode.toLowerCase().includes('online') ? (
                <Video size={13} />
              ) : (
                <MapPin size={13} />
              )}
              <span>{mode}</span>
            </div>
          )}
        </div>
      </div>
      {bookingUrl && (
        <Link
          to={bookingUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--teal)',
            marginTop: 'auto',
          }}
        >
          Book this service <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
