import { Clock, Globe, AlertCircle } from 'lucide-react';

export default function SlotPicker({
  slots = [],
  selectedSlot = null,
  onSelectSlot,
  loading = false,
  timezone = 'Asia/Kolkata',
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={16} color="var(--teal)" />
          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Available Time Slots
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
          <Globe size={12} />
          <span>{timezone}</span>
        </div>
      </div>

      {/* Slots Body */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, padding: '10px 0' }}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="skeleton"
              style={{ height: 38, borderRadius: 'var(--radius-md)' }}
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          gap: 8,
        }}>
          <AlertCircle size={24} />
          <p style={{ fontSize: 13 }}>No available slots on this date.</p>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Please pick another day or contact the therapist.
          </span>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: 10,
          maxHeight: '280px',
          overflowY: 'auto',
          paddingRight: 4,
        }}>
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot.scheduledAt || selectedSlot === slot.startTime;

            return (
              <button
                key={slot.scheduledAt || slot.startTime}
                type="button"
                onClick={() => onSelectSlot(slot)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '1px solid var(--teal)' : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'linear-gradient(135deg, var(--teal), var(--teal-dim))'
                    : 'var(--bg-elevated)',
                  color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 0 0 3px var(--teal-glow)' : 'none',
                }}
              >
                {slot.startTime} - {slot.endTime}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
