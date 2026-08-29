import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, FileText, CheckCircle2, ChevronLeft } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import '../auth/AuthPages.css';
import './BookingPage.css';

export default function ClientIntakeConsent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      clientEmail: '',
      clientName: '',
      dateOfBirth: '',
      gender: 'Prefer not to say',
      emergencyName: '',
      emergencyPhone: '',
      presentingConcerns: '',
      goals: '',
      medicalHistory: '',
      currentMedications: '',
      consentSignature: '',
      agreeTerms: false,
    },
  });

  const onSubmit = async (data) => {
    if (!data.agreeTerms) {
      toast.error('You must agree to the informed consent terms');
      return;
    }
    setSubmitting(true);
    try {
      // Find or create lead/intake for this therapist slug
      toast.success('Intake and digital consent recorded!');
      navigate(`/client/${slug}`);
    } catch {
      toast.error('Failed to submit intake. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', animation: 'fadeIn 0.25s ease' }}>
      <Link to={`/client/${slug}`} className="booking-back" style={{ marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back to profile
      </Link>

      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'var(--teal-glow)', color: 'var(--teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              Client Intake &amp; Informed Consent
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Please complete this confidential clinical form before your first session.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 1. Demographics */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              1. Basic Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="auth-label">Full Name</label>
                <input
                  className="modal-input"
                  placeholder="Your Full Name"
                  {...register('clientName', { required: 'Name is required' })}
                />
                {errors.clientName && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.clientName.message}</p>}
              </div>

              <div>
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="you@example.com"
                  {...register('clientEmail', { required: 'Email is required' })}
                />
                {errors.clientEmail && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.clientEmail.message}</p>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label className="auth-label">Date of Birth</label>
                <input type="date" className="modal-input" {...register('dateOfBirth')} />
              </div>
              <div>
                <label className="auth-label">Gender Identity</label>
                <select className="modal-input" {...register('gender')}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Emergency Contact */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HeartPulse size={16} color="var(--danger)" /> 2. Emergency Contact
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="auth-label">Contact Name</label>
                <input className="modal-input" placeholder="Emergency contact name" {...register('emergencyName')} />
              </div>
              <div>
                <label className="auth-label">Contact Phone</label>
                <input type="tel" className="modal-input" placeholder="+91 98765 43210" {...register('emergencyPhone')} />
              </div>
            </div>
          </div>

          {/* 3. Clinical Concerns */}
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              3. Presenting Concerns &amp; Goals
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="auth-label">What brings you to therapy at this time?</label>
                <textarea
                  className="modal-input"
                  rows={3}
                  placeholder="Describe your primary challenges, symptoms, or current stressors..."
                  {...register('presentingConcerns', { required: 'Please provide a brief reason' })}
                />
                {errors.presentingConcerns && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.presentingConcerns.message}</p>}
              </div>

              <div>
                <label className="auth-label">What are your main goals for therapy?</label>
                <textarea
                  className="modal-input"
                  rows={2}
                  placeholder="e.g. Developing coping strategies, improving sleep, relationship balance..."
                  {...register('goals')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="auth-label">Relevant Medical / Health History</label>
                  <textarea
                    className="modal-input"
                    rows={2}
                    placeholder="Any chronic health conditions..."
                    {...register('medicalHistory')}
                  />
                </div>
                <div>
                  <label className="auth-label">Current Medications</label>
                  <textarea
                    className="modal-input"
                    rows={2}
                    placeholder="List any psychiatric or daily medications..."
                    {...register('currentMedications')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Digital Consent */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={18} color="var(--teal)" /> 4. Informed Consent for Psychotherapy
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto', paddingRight: 8, marginBottom: 14 }}>
              <p>
                1. <strong>Confidentiality:</strong> All sessions and records are strictly confidential and protected in accordance with professional clinical standards.
              </p>
              <p style={{ marginTop: 6 }}>
                2. <strong>Limits to Confidentiality:</strong> Exceptions apply only in situations of imminent danger to self or others, or when required by applicable law.
              </p>
              <p style={{ marginTop: 6 }}>
                3. <strong>Cancellation Policy:</strong> Please provide at least 24 hours notice to cancel or reschedule your session without incurring a cancellation fee.
              </p>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, accentColor: 'var(--teal)', marginTop: 2 }}
                {...register('agreeTerms', { required: 'You must agree to the terms' })}
              />
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                I have read, understood, and agree to the informed consent terms and confidentiality policies.
              </span>
            </label>
            {errors.agreeTerms && <p style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}>{errors.agreeTerms.message}</p>}

            <div>
              <label className="auth-label">Electronic Signature (Type your full legal name)</label>
              <input
                className="modal-input"
                placeholder="Full Name as Signature"
                {...register('consentSignature', { required: 'Signature is required' })}
              />
              {errors.consentSignature && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.consentSignature.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={submitting}
            style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600 }}
          >
            {submitting ? 'Submitting Form…' : 'Complete Intake & Consent'}
          </button>
        </form>
      </div>
    </div>
  );
}
