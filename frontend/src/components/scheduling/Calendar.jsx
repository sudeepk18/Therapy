import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday,
} from 'date-fns';

export default function Calendar({ selectedDate, onSelectDate, minDate = startOfToday() }) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      width: '100%',
      maxWidth: '380px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h4>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={prevMonth}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
        {weekDays.map((d) => (
          <span key={d} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day, idx) => {
          const isSelected = selectedDate ? isSameDay(day, new Date(selectedDate)) : false;
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPast = minDate ? isBefore(day, minDate) && !isSameDay(day, minDate) : false;
          const isDisabled = !isCurrentMonth || isPast;

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(format(day, 'yyyy-MM-dd'))}
              style={{
                height: 38,
                borderRadius: 'var(--radius-md)',
                border: isSelected ? '1px solid var(--teal)' : '1px solid transparent',
                background: isSelected
                  ? 'linear-gradient(135deg, var(--teal), var(--teal-dim))'
                  : isSameDay(day, new Date())
                  ? 'var(--bg-elevated)'
                  : 'transparent',
                color: isSelected
                  ? '#ffffff'
                  : isDisabled
                  ? 'var(--text-muted)'
                  : isCurrentMonth
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                opacity: isDisabled ? 0.35 : 1,
                fontSize: 13,
                fontWeight: isSelected || isSameDay(day, new Date()) ? 700 : 500,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
