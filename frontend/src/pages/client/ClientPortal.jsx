import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Shield, Calendar, ChevronRight } from 'lucide-react';
import { clientPortalApi } from '../../api/client.portal.api';
import { Spinner } from '../../components/common/Common';
import Hero from '../../components/profile/Hero';
import About from '../../components/profile/About';
import ServiceCard from '../../components/profile/ServiceCard';
import './ClientPortal.css';

/**
 * ClientPortal — public therapist profile page.
 * Accessible at: /client/:slug or /:slug
 * No authentication required.
 */
export default function ClientPortal({ customSlug }) {
  const params = useParams();
  const slug = customSlug || params.slug;

  const [therapist, setTherapist] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchProfile = async () => {
      try {
        const res = await clientPortalApi.getTherapistBySlug(slug);
        setTherapist(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('This therapist profile was not found.');
        } else {
          setError('Could not load profile. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  if (loading) return <Spinner fullPage />;

  if (error || !therapist) {
    return (
      <div className="cp-error">
        <div className="cp-error-icon">🔍</div>
        <h2>Profile Not Found</h2>
        <p>{error || 'Therapist not found'}</p>
      </div>
    );
  }

  const bookingUrl = `/client/${slug}/booking`;

  // Sample service offerings if not explicitly populated
  const defaultServices = [
    {
      title: 'Individual Therapy',
      duration: 50,
      mode: 'Online Video / In-Person',
      description: 'One-on-one confidential psychotherapy session tailored to your mental health goals.',
      price: 1500,
    },
    {
      title: 'Couples Consultation',
      duration: 60,
      mode: 'Online Video',
      description: 'Relationship guidance, communication coaching, and conflict resolution.',
      price: 2200,
    },
    {
      title: 'Initial Discovery Call',
      duration: 15,
      mode: 'Online / Phone',
      description: 'Brief consultation to discuss your presenting concerns and determine therapy fit.',
      price: 0,
    },
  ];

  return (
    <div className="cp-profile" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Hero Section */}
      <Hero therapist={therapist} bookingUrl={bookingUrl} />

      {/* About & Contact Section */}
      <About therapist={therapist} />

      {/* Services Section */}
      <div style={{ marginTop: 24 }}>
        <h3 className="cp-info-title" style={{ fontSize: 18, marginBottom: 14 }}>Services & Consultations</h3>
        <div className="cp-info-grid">
          {defaultServices.map((svc, idx) => (
            <ServiceCard
              key={idx}
              title={svc.title}
              duration={svc.duration}
              mode={svc.mode}
              description={svc.description}
              price={svc.price}
              bookingUrl={bookingUrl}
            />
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="cp-trust-row" style={{ marginTop: 24 }}>
        <div className="cp-trust-badge">
          <Shield size={16} color="var(--teal)" />
          <span>HIPAA Compliant</span>
        </div>
        <div className="cp-trust-badge">
          <Star size={16} color="var(--warning)" />
          <span>Verified Practice</span>
        </div>
        <div className="cp-trust-badge">
          <Shield size={16} color="var(--violet)" />
          <span>Encrypted &amp; Confidential</span>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="cp-cta-banner" style={{ marginTop: 24 }}>
        <div>
          <h2 className="cp-cta-title">Ready to start your journey?</h2>
          <p className="cp-cta-sub">Book a session or consultation with {therapist.name?.split(' ')[0]}.</p>
        </div>
        <Link to={bookingUrl} className="cp-book-btn" id="cp-cta-book-btn">
          <Calendar size={16} />
          Book Now
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
