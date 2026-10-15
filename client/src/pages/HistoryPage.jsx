import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  Stethoscope,
  FileText,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { getTranslation } from '../i18n/translations.js';
import { API_BASE } from '../config/api.js';

export default function HistoryPage({ language = 'en', onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const t = getTranslation(language);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/history`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to load consultation history.');
        }

        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  const handleOpenReport = (sessionId) => {
    navigate(`/report/${sessionId}`);
  };

  const handleResumeChat = (sessionId) => {
    if (onSelectSession) {
      onSelectSession(sessionId);
    }
    localStorage.setItem('sakhiguide_session_id', sessionId);
    navigate('/');
  };

  const getTriageBadge = (level) => {
    switch (level) {
      case 'urgent':
        return {
          label: 'Urgent Care',
          className: 'triage-badge-urgent',
        };
      case 'routine_visit':
        return {
          label: 'Routine Visit',
          className: 'triage-badge-amber',
        };
      default:
        return {
          label: 'Self-Care',
          className: 'triage-badge-green',
        };
    }
  };

  return (
    <div className="history-page-container">
      <div className="history-content-wrapper">
        {/* Page Header */}
        <header className="history-header">
          <div className="history-header-left">
            <h1 className="history-title">My Consultation History</h1>
            <p className="history-subtitle">
              Past symptom descriptions and clinical doctor summaries linked to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-create-summary"
          >
            <Sparkles size={16} />
            <span>New Symptom Check</span>
          </button>
        </header>

        {/* Error State */}
        {error && (
          <div className="auth-error-alert" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="history-loading">
            <div className="spinner" />
            <p>Loading your past consultations...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sessions.length === 0 && (
          <div className="history-empty-card">
            <div className="empty-state-badge">
              <FileText size={26} />
            </div>
            <h2>No Saved History Yet</h2>
            <p>
              When you consult Evara AI while logged in, your symptom patterns, triage guidance, and printable doctor summaries are automatically preserved here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary-auth"
              style={{ maxWidth: '280px', marginTop: '16px' }}
            >
              Start Your First Symptom Check
            </button>
          </div>
        )}

        {/* Session Cards List */}
        {!loading && sessions.length > 0 && (
          <div className="history-cards-list">
            {sessions.map((item) => {
              const triage = getTriageBadge(item.triageLevel);
              const formattedDate = new Date(item.sessionDate).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <article key={item.sessionId} className="history-session-card">
                  {/* Card Header */}
                  <div className="card-top-row">
                    <div className="date-group">
                      <Calendar size={15} className="card-icon-muted" />
                      <time className="session-date-time">{formattedDate}</time>
                      <span className="session-lang-tag">{item.language.toUpperCase()}</span>
                    </div>

                    <div className="triage-status-group">
                      {item.redFlagCount > 0 && (
                        <span className="redflag-badge" title="Critical symptom trigger detected">
                          <ShieldAlert size={13} /> Red Flag
                        </span>
                      )}
                      <span className={`triage-badge-pill ${triage.className}`}>
                        {triage.label}
                      </span>
                    </div>
                  </div>

                  {/* Specialist and message count */}
                  <div className="card-middle-row">
                    <div className="specialist-info">
                      <Stethoscope size={16} className="specialist-icon" />
                      <span>
                        Recommended Specialist:{' '}
                        <strong>{item.suggestedSpecialist}</strong>
                      </span>
                    </div>
                    <div className="message-count-info">
                      <MessageSquare size={14} />
                      <span>{item.messageCount} messages</span>
                    </div>
                  </div>

                  {/* Symptoms Tags Preview */}
                  {item.symptoms && item.symptoms.length > 0 && (
                    <div className="card-symptoms-row">
                      <span className="symptoms-label">Identified:</span>
                      <div className="symptoms-tag-cloud">
                        {item.symptoms.slice(0, 5).map((sym, idx) => (
                          <span key={idx} className="symptom-chip">
                            {sym.name || sym}
                          </span>
                        ))}
                        {item.symptoms.length > 5 && (
                          <span className="symptom-chip-more">
                            +{item.symptoms.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* English Summary Preview if present */}
                  {item.summaryEn && (
                    <p className="card-summary-preview">
                      "{item.summaryEn.length > 160 ? `${item.summaryEn.slice(0, 160)}...` : item.summaryEn}"
                    </p>
                  )}

                  {/* Card Actions */}
                  <div className="card-actions-row">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(item.sessionId)}
                      className="btn-history-report"
                      title="View printable clinical summary for this visit"
                    >
                      <FileText size={15} />
                      <span>View Doctor Summary</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResumeChat(item.sessionId)}
                      className="btn-history-resume"
                      title="Continue chatting on this session"
                    >
                      <MessageSquare size={15} />
                      <span>Continue Conversation</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner text={t.disclaimer} />
    </div>
  );
}
