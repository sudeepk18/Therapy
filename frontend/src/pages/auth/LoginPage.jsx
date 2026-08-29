import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]   = useState({ email: '', password: '' });
  const [show, setShow]   = useState(false);
  const [busy, setBusy]   = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await login(form.email, form.password);
    setBusy(false);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/therapist/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="auth-page">
      <h2 className="auth-heading">Sign in to your practice</h2>
      <p className="auth-subheading">Access your therapist dashboard</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-label">Email address</label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="login-email"
              type="email"
              name="email"
              className="auth-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label htmlFor="login-password" className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input
              id="login-password"
              type={show ? 'text' : 'password'}
              name="password"
              className="auth-input auth-input--pass"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShow((s) => !s)}
              aria-label="Toggle password visibility"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          id="login-submit"
          type="submit"
          className="auth-btn"
          disabled={busy}
        >
          {busy ? <Loader size={16} className="spin-icon" /> : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="auth-link">Create one free</Link>
      </p>
    </div>
  );
}
