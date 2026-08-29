import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Briefcase, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', practiceName: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    const result = await register(form);
    setBusy(false);
    if (result.success) {
      toast.success('Practice created! Welcome to Unfazed.');
      navigate('/therapist/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-heading">Create your practice</h2>
      <p className="auth-subheading">Start managing sessions in minutes</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="reg-name" className="auth-label">Full name</label>
          <div className="auth-input-wrap">
            <User size={16} className="auth-input-icon" />
            <input id="reg-name" type="text" name="name" className="auth-input"
              placeholder="Dr. Priya Sharma" value={form.name} onChange={handleChange} required />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-practice" className="auth-label">Practice name</label>
          <div className="auth-input-wrap">
            <Briefcase size={16} className="auth-input-icon" />
            <input id="reg-practice" type="text" name="practiceName" className="auth-input"
              placeholder="Calm Mind Clinic" value={form.practiceName} onChange={handleChange} />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-email" className="auth-label">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input id="reg-email" type="email" name="email" className="auth-input"
              placeholder="you@example.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="reg-password" className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input id="reg-password" type={show ? 'text' : 'password'} name="password"
              className="auth-input auth-input--pass" placeholder="Min 8 characters"
              value={form.password} onChange={handleChange} required />
            <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button id="register-submit" type="submit" className="auth-btn" disabled={busy}>
          {busy ? <Loader size={16} className="spin-icon" /> : 'Create practice'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link to="/login" className="auth-link">Sign in</Link>
      </p>
    </div>
  );
}
