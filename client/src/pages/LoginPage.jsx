import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { getTranslation } from '../i18n/translations.js';

export default function LoginPage({ language = 'en' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = getTranslation(language);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header Branding */}
        <div className="auth-header">
          <div className="auth-brand-badge">🌸</div>
          <h1 className="auth-title">Welcome to Evara AI</h1>
          <p className="auth-subtitle">
            Sign in to securely access and view your symptom logs & doctor summaries.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-alert" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-primary-auth" disabled={loading}>
            {loading ? (
              <span className="btn-spinner-content">
                <span className="spinner-sm" /> Logging in...
              </span>
            ) : (
              <span>Sign In to Evara</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Prominent Continue as Guest Button */}
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="btn-guest-action"
          title="Use Evara AI completely anonymously without an account"
        >
          <UserCheck size={18} className="guest-icon" />
          <div className="guest-btn-text">
            <strong>Continue as Guest (Anonymous)</strong>
            <span>No account required • Immediate confidential symptom guidance</span>
          </div>
        </button>

        {/* Switch to Register */}
        <div className="auth-footer-link">
          <span>Don't have an account yet? </span>
          <Link to="/register" className="auth-link">
            Create an Account <ArrowRight size={14} className="link-arrow" />
          </Link>
        </div>

        {/* Privacy reassurance badge */}
        <div className="auth-privacy-guarantee">
          <Shield size={14} className="shield-icon" />
          <span>Your privacy is safeguarded. We never sell or share your health data.</span>
        </div>
      </div>

      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner text={t.disclaimer} />
    </div>
  );
}
