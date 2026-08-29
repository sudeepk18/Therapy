import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, Video, MapPin, User, Mail, Phone, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { clientPortalApi } from '../../api/client.portal.api';
import { Spinner } from '../../components/common/Common';
import Calendar from '../../components/scheduling/Calendar';
import SlotPicker from '../../components/scheduling/SlotPicker';
import { format, startOfToday } from 'date-fns';
import toast from 'react-hot-toast';
import './BookingPage.css';

const SESSION_TYPES = [
  { value: 'consultation', label: 'Free Consultation (15 min)', duration: 15, price: 0 },
  { value: 'individual',   label: 'Individual Therapy (50 min)', duration: 50, price: 1500 },
  { value: 'couples',      label: 'Couples Therapy (60 min)',   duration: 60, price: 2200 },
  { value: 'family',       label: 'Family Therapy (60 min)',    duration: 60, price: 2500 },
];

/**
 * BookingPage — public booking flow with dynamic Calendar and SlotPicker.
 * Accessible at: /:slug/booking or /client/:slug/booking
 */
export default function BookingPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const [therapist, setTherapist] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots,     setSlots]     = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = format(startOfToday(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSlotObj, setSelectedSlotObj] = useState(null);

  const [form, setForm] = useState({
    sessionType:     'individual',
    medium:          'online',
    scheduledAt:     '',
    clientName:      '',
    clientEmail:     '',
    clientPhone:     '',
    notes:           '',
  });

  const selectedType = SESSION_TYPES.find(t => t.value === form.sessionType) || SESSION_TYPES[1];

  // Fetch therapist info
  useEffect(() => {
    clientPortalApi.getTherapistBySlug(slug)
      .then(res => setTherapist(res.data.data))
      .catch(() => toast.error('Could not load therapist details'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch available slots whenever selectedDate or sessionType duration changes
  useEffect(() => {
    if (!slug || !selectedDate) return;
    setSlotsLoading(true);
    clientPortalApi.getAvailableSlots(slug, {
      date: selectedDate,
      duration: selectedType.duration,
    })
      .then(res => {
        const fetchedSlots = res.data.data?.slots || [];
        setSlots(fetchedSlots);
        // Clear slot if date changed and selected slot is not in new date
        if (selectedSlotObj && !fetchedSlots.some(s => s.scheduledAt === selectedSlotObj.scheduledAt)) {
          setSelectedSlotObj(null);
          setForm(f => ({ ...f, scheduledAt: '' }));
        }
      })
      .catch(() => {
        setSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [slug, selectedDate, selectedType.duration]);

  const handleChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelectSlot = (slot) => {
    setSelectedSlotObj(slot);
    setForm(f => ({ ...f, scheduledAt: slot.scheduledAt }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail) {
      toast.error('Name and email are required');
      return;
    }
    if (!form.scheduledAt) {
      toast.error('Please choose an available time slot from the calendar');
      return;
    }
    setSubmitting(true);
    try {
      await clientPortalApi.requestBooking(slug, form);
      toast.success('Appointment booked successfully!');
      navigate(`/client/${slug}/payment`, { state: { form, therapist, selectedType } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please pick another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullPage />;

  return (
    <div className="booking-page" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Back link */}
      <Link to={`/client/${slug}`} className="booking-back">
        <ChevronLeft size={16} /> Back to profile
      </Link>

      <div className="booking-layout">
        {/* Left: Summary card */}
        <aside className="booking-summary">
          <div className="booking-therapist-card">
            <div className="booking-therapist-avatar">
              {therapist?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="booking-therapist-name">{therapist?.name}</p>
              <p className="booking-therapist-practice">{therapist?.practiceName}</p>
            </div>
          </div>

          {/* Selected session summary */}
          <div className="booking-detail-list">
            <div className="booking-detail-row">
              <CalendarIcon size={14} />
              <span>{selectedType.label}</span>
            </div>
            <div className="booking-detail-row">
              <Clock size={14} />
              <span>{selectedType.duration} minutes</span>
            </div>
            <div className="booking-detail-row">
              {form.medium === 'online' ? <Video size={14} /> : <MapPin size={14} />}
              <span style={{ textTransform: 'capitalize' }}>{form.medium} Session</span>
            </div>
            {selectedSlotObj && (
              <div className="booking-detail-row" style={{ color: 'var(--teal)', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>
                  {format(new Date(selectedSlotObj.scheduledAt), 'EEE, dd MMM yyyy')} at {selectedSlotObj.startTime}
                </span>
              </div>
            )}
          </div>

          <div className="booking-trust">
            <p>🔒 Your information is encrypted and strictly confidential.</p>
          </div>
        </aside>

        {/* Right: Booking Form */}
        <div className="booking-form-wrap">
          <h2 className="booking-form-title">Schedule Your Appointment</h2>

          <form className="booking-form" onSubmit={handleSubmit} noValidate>
            {/* 1. Session type */}
            <fieldset className="booking-fieldset">
              <legend className="booking-legend">1. Select Service</legend>
              <div className="booking-type-grid">
                {SESSION_TYPES.map(t => (
                  <label
                    key={t.value}
                    className={`booking-type-card ${form.sessionType === t.value ? 'booking-type-card--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="sessionType"
                      value={t.value}
                      className="sr-only"
                      checked={form.sessionType === t.value}
                      onChange={handleChange}
                    />
                    <span className="booking-type-label">{t.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 2. Medium */}
            <fieldset className="booking-fieldset">
              <legend className="booking-legend">2. Mode of Session</legend>
              <div className="booking-medium-row">
                {['online', 'in-person', 'phone'].map(m => (
                  <label
                    key={m}
                    className={`booking-medium-chip ${form.medium === m ? 'booking-medium-chip--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="medium"
                      value={m}
                      className="sr-only"
                      checked={form.medium === m}
                      onChange={handleChange}
                    />
                    {m === 'online' ? <Video size={13} /> : m === 'phone' ? <Phone size={13} /> : <MapPin size={13} />}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* 3. Date & Available Slots */}
            <fieldset className="booking-fieldset">
              <legend className="booking-legend">3. Choose Date & Time Slot</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={(d) => setSelectedDate(d)}
                />
                <SlotPicker
                  slots={slots}
                  selectedSlot={selectedSlotObj?.scheduledAt}
                  onSelectSlot={handleSelectSlot}
                  loading={slotsLoading}
                />
              </div>
            </fieldset>

            {/* 4. Client details */}
            <fieldset className="booking-fieldset">
              <legend className="booking-legend">4. Your Contact Details</legend>
              <div className="booking-field-row">
                <div className="booking-field">
                  <label htmlFor="booking-name" className="booking-label">Your Full Name</label>
                  <div className="booking-input-wrap">
                    <User size={14} className="booking-input-icon" />
                    <input
                      id="booking-name"
                      type="text"
                      name="clientName"
                      className="booking-input booking-input--icon"
                      placeholder="Ananya Deshmukh"
                      value={form.clientName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="booking-field">
                  <label htmlFor="booking-email" className="booking-label">Email Address</label>
                  <div className="booking-input-wrap">
                    <Mail size={14} className="booking-input-icon" />
                    <input
                      id="booking-email"
                      type="email"
                      name="clientEmail"
                      className="booking-input booking-input--icon"
                      placeholder="ananya@example.com"
                      value={form.clientEmail}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="booking-phone" className="booking-label">
                  Phone Number <span className="booking-optional">(optional)</span>
                </label>
                <div className="booking-input-wrap">
                  <Phone size={14} className="booking-input-icon" />
                  <input
                    id="booking-phone"
                    type="tel"
                    name="clientPhone"
                    className="booking-input booking-input--icon"
                    placeholder="+91 98201 54321"
                    value={form.clientPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="booking-notes" className="booking-label">
                  Reason for visit / Notes <span className="booking-optional">(optional)</span>
                </label>
                <textarea
                  id="booking-notes"
                  name="notes"
                  className="booking-input"
                  rows={3}
                  placeholder="Briefly describe what you would like to focus on in this session…"
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>
            </fieldset>

            <button
              id="confirm-booking-btn"
              type="submit"
              className="booking-submit-btn"
              disabled={submitting || !selectedSlotObj}
            >
              {submitting ? 'Confirming Booking…' : 'Confirm Appointment →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
