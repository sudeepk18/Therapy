import { Link } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';

export default function Hero({ therapist, bookingUrl }) {
  const initials = therapist?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="cp-hero">
      <div className="cp-hero-avatar">{initials}</div>
      <div className="cp-hero-info">
        <h1 className="cp-hero-name">{therapist.name}</h1>
        {therapist.practiceName && (
          <p className="cp-hero-practice">{therapist.practiceName}</p>
        )}
        {therapist.specializations?.length > 0 && (
          <div className="cp-tags">
            {therapist.specializations.map(s => (
              <span key={s} className="cp-tag">{s}</span>
            ))}
          </div>
        )}
      </div>
      <Link
        to={bookingUrl}
        className="cp-book-btn"
        id="client-book-session-btn"
      >
        <Calendar size={16} />
        Book a Session
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
