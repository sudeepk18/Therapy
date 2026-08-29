import { Globe, MapPin, Phone } from 'lucide-react';

export default function About({ therapist }) {
  return (
    <div className="cp-info-grid">
      {therapist.bio && (
        <div className="cp-info-card cp-info-card--wide">
          <h3 className="cp-info-title">About</h3>
          <p className="cp-info-text">{therapist.bio}</p>
        </div>
      )}

      <div className="cp-info-card">
        <h3 className="cp-info-title">Contact</h3>
        <div className="cp-contact-list">
          {therapist.email && (
            <div className="cp-contact-row">
              <Globe size={14} />
              <span>{therapist.email}</span>
            </div>
          )}
          {therapist.phone && (
            <div className="cp-contact-row">
              <Phone size={14} />
              <span>{therapist.phone}</span>
            </div>
          )}
          {therapist.city && (
            <div className="cp-contact-row">
              <MapPin size={14} />
              <span>{therapist.city}, {therapist.country || 'India'}</span>
            </div>
          )}
        </div>
      </div>

      {therapist.languages?.length > 0 && (
        <div className="cp-info-card">
          <h3 className="cp-info-title">Languages</h3>
          <div className="cp-tags" style={{ marginTop: 8 }}>
            {therapist.languages.map(l => (
              <span key={l} className="cp-tag cp-tag--violet">{l}</span>
            ))}
          </div>
        </div>
      )}

      {therapist.sessionModes?.length > 0 && (
        <div className="cp-info-card">
          <h3 className="cp-info-title">Session Modes</h3>
          <div className="cp-tags" style={{ marginTop: 8 }}>
            {therapist.sessionModes.map(m => (
              <span key={m} className="cp-tag cp-tag--success">{m}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
