import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Globe,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { getTranslation, SUPPORTED_LANGUAGES } from '../i18n/translations.js';

export default function ProfilePage({ language = 'en', onSelectLanguage }) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const t = getTranslation(language);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || language);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await updateProfile({
        displayName: displayName.trim(),
        preferredLanguage,
      });

      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
        if (onSelectLanguage && preferredLanguage !== language) {
          onSelectLanguage(preferredLanguage);
        }
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account destruction.');
      return;
    }

    try {
      setDeleting(true);
      setDeleteError('');
      const res = await deleteAccount();
      if (res.success) {
        localStorage.removeItem('sakhiguide_session_id');
        navigate('/', { replace: true });
      } else {
        setDeleteError(res.error || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError(err.message || 'An error occurred while deleting account.');
    } finally {
      setDeleting(false);
    }
  };

  const formattedCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return (
    <div className="profile-page-container">
      <div className="profile-content-wrapper">
        <header className="profile-header">
          <div className="profile-avatar-circle">
            <User size={32} />
          </div>
          <div>
            <h1 className="profile-title">Account & Privacy Settings</h1>
            <p className="profile-subtitle">
              Manage your profile preferences and exercise full control over your health data.
            </p>
          </div>
        </header>

        {/* Feedback Messages */}
        {successMsg && (
          <div className="auth-success-alert" role="status">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="auth-error-alert" role="alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="profile-card">
          <h2 className="card-heading">Personal Details</h2>
          <form onSubmit={handleSaveProfile} className="auth-form">
            {/* Email (Read Only) */}
            <div className="form-group">
              <label htmlFor="prof-email" className="form-label">
                Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="field-icon disabled" aria-hidden="true" />
                <input
                  id="prof-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="form-input disabled"
                  title="Your email is your confidential account key"
                />
              </div>
              <span className="field-hint">
                Email cannot be modified directly to protect account integrity.
              </span>
            </div>

            {/* Display Name */}
            <div className="form-group">
              <label htmlFor="prof-name" className="form-label">
                Display Name
              </label>
              <div className="input-with-icon">
                <User size={18} className="field-icon" aria-hidden="true" />
                <input
                  id="prof-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your preferred name or alias"
                  className="form-input"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Preferred Language */}
            <div className="form-group">
              <label htmlFor="prof-lang" className="form-label">
                Preferred Regional Language
              </label>
              <div className="input-with-icon">
                <Globe size={18} className="field-icon" aria-hidden="true" />
                <select
                  id="prof-lang"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="form-input form-select"
                  disabled={saving}
                >
                  {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Member Since info */}
            <div className="profile-meta-row">
              <div className="meta-item">
                <Calendar size={15} />
                <span>Account Created: {formattedCreated}</span>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="btn-primary-auth"
              style={{ maxWidth: '240px' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </div>

        {/* Privacy & Health Data Sovereignty */}
        <div className="profile-card privacy-card">
          <div className="card-header-with-icon">
            <Shield size={20} className="shield-privacy-icon" />
            <h2 className="card-heading">Privacy & Data Sovereignty Guarantee</h2>
          </div>
          <p className="privacy-body-text">
            Evara AI is designed with strict healthcare data confidentiality principles:
          </p>
          <ul className="privacy-guarantee-bullets">
            <li>We do not sell, rent, or commercialize your personal health or symptom data.</li>
            <li>We do not ask for or store phone numbers, home addresses, or government IDs.</li>
            <li>All doctor summaries and symptom timeline records belong completely to you.</li>
          </ul>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="profile-card danger-zone-card">
          <div className="card-header-with-icon">
            <Trash2 size={20} className="danger-zone-icon" />
            <h2 className="card-heading danger-heading">Danger Zone: Delete Account</h2>
          </div>
          <p className="danger-body-text">
            Permanently delete your account and remove all symptom logs, messages, and clinical summaries from our servers. This action is irreversible.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger-outline"
          >
            <Trash2 size={16} />
            <span>Delete My Account & All Health Data</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="del-modal-title">
          <div className="modal-card">
            <div className="modal-icon-warning">
              <AlertTriangle size={32} />
            </div>
            <h3 id="del-modal-title" className="modal-title">
              Delete Your Account Permanently?
            </h3>
            <p className="modal-warning-text">
              This will immediately wipe your account (<strong>{user?.email}</strong>) and permanently purge all associated symptom consultations, doctor reports, and chat transcripts.
            </p>

            {deleteError && (
              <div className="auth-error-alert" role="alert">
                <span>⚠️ {deleteError}</span>
              </div>
            )}

            <div className="modal-confirm-input-group">
              <label htmlFor="confirm-delete-box" className="modal-input-label">
                Please type <strong>DELETE</strong> below to confirm:
              </label>
              <input
                id="confirm-delete-box"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="form-input modal-confirm-field"
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                  setDeleteError('');
                }}
                className="btn-modal-cancel"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-modal-delete"
                disabled={deleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
              >
                {deleting ? 'Purging Data...' : 'Permanently Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner text={t.disclaimer} />
    </div>
  );
}
