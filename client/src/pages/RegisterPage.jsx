import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Check, X, Shield, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { getTranslation } from '../i18n/translations.js';

export default function RegisterPage({ language = 'en' }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const t = getTranslation(language);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isMatch = password && confirmPassword && password === confirmPassword;

  // Strength score: 0 to 4
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = strengthScore <= 1 ? 'Weak' : strengthScore === 2 || strengthScore === 3 ? 'Medium' : 'Strong';
  const strengthColorClass = strengthScore <= 1 ? 'strength-weak' : strengthScore <= 3 ? 'strength-medium' : 'strength-strong';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await register(email, password, displayName, language);
      if (res.success) {
        navigate('/', { replace: true });
      } else {
        setError(res.error || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
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
          <h1 className="auth-title">Create an Evara Account</h1>
          <p className="auth-subtitle">
            Sign up to keep your symptom logs, patterns, and doctor summaries synchronized.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-alert" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" aria-hidden="true" />
              <input
                id="reg-email"
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

          {/* Optional Display Name */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Display Name <span className="optional-tag">(Optional)</span>
            </label>
            <div className="input-with-icon">
              <User size={18} className="field-icon" aria-hidden="true" />
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How may we address you?"
                autoComplete="name"
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              Password <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" aria-hidden="true" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters with letters & digits"
                required
                autoComplete="new-password"
                className="form-input"
                disabled={loading}
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {password.length > 0 && (
              <div className="password-meter-container">
                <div className="meter-header">
                  <span className="meter-caption">Password Strength:</span>
                  <span className={`meter-label ${strengthColorClass}`}>{strengthLabel}</span>
                </div>
                <div className="meter-track">
                  <div
                    className={`meter-bar ${strengthColorClass}`}
                    style={{ width: `${(strengthScore / 4) * 100}%` }}
                  />
                </div>
                <ul className="strength-checklist">
                  <li className={hasMinLength ? 'met' : 'unmet'}>
                    {hasMinLength ? <Check size={12} /> : <X size={12} />} At least 8 characters
                  </li>
                  <li className={hasLetter ? 'met' : 'unmet'}>
                    {hasLetter ? <Check size={12} /> : <X size={12} />} Contains letters
                  </li>
                  <li className={hasNumber ? 'met' : 'unmet'}>
                    {hasNumber ? <Check size={12} /> : <X size={12} />} Contains numbers
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">
              Confirm Password <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" aria-hidden="true" />
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                autoComplete="new-password"
                className="form-input"
                disabled={loading}
              />
            </div>
            {confirmPassword.length > 0 && (
              <div className="match-status">
                {isMatch ? (
                  <span className="match-success">
                    <Check size={13} /> Passwords match
                  </span>
                ) : (
                  <span className="match-error">
                    <X size={13} /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Privacy statement banner */}
          <div className="privacy-callout">
            <Shield size={16} className="privacy-callout-icon" />
            <p className="privacy-callout-text">
              We only use your email to save your symptom records. We never sell, share, or monetize your personal health information.
            </p>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-primary-auth" disabled={loading}>
            {loading ? (
              <span className="btn-spinner-content">
                <span className="spinner-sm" /> Creating Account...
              </span>
            ) : (
              <span>Create My Free Account</span>
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
          title="Use Evara AI completely anonymously without creating an account"
        >
          <UserCheck size={18} className="guest-icon" />
          <div className="guest-btn-text">
            <strong>Continue as Guest (No Account)</strong>
            <span>You can always register later if you wish to retain your history</span>
          </div>
        </button>

        {/* Switch to Login */}
        <div className="auth-footer-link">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">
            Log In <ArrowRight size={14} className="link-arrow" />
          </Link>
        </div>
      </div>

      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner text={t.disclaimer} />
    </div>
  );
}
