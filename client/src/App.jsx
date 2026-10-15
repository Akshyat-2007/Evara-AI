import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import Navbar from './components/Navbar.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import DoctorSummary from './components/DoctorSummary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { getTranslation } from './i18n/translations.js';
import { API_BASE } from './config/api.js';

/**
 * Route wrapper for standalone or linked Doctor Summary page
 */
function DoctorSummaryPageWrapper({ language }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  return (
    <DoctorSummary
      sessionId={sessionId}
      language={language}
      onBackToChat={() => navigate('/')}
    />
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('sakhiguide_session_id') || '');
  const [language, setLanguage] = useState(() => localStorage.getItem('sakhiguide_language') || 'auto');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const navigate = useNavigate();
  const t = getTranslation(language);

  // Initialize or restore session
  useEffect(() => {
    async function initSession() {
      if (!sessionId) {
        try {
          const res = await fetch(`${API_BASE}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ language }),
          });
          const data = await res.json();
          if (data.sessionId) {
            setSessionId(data.sessionId);
            localStorage.setItem('sakhiguide_session_id', data.sessionId);
          }
        } catch (err) {
          console.error('Session initialization error:', err);
          setGlobalError('Could not connect to Evara backend. Please make sure the server is running on port 5000.');
        }
      }
    }

    initSession();
  }, [sessionId, language]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('sakhiguide_language', newLang);
  };

  // Load an existing session into chat (e.g. from history)
  const loadExistingSession = useCallback(async (targetSessionId) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/report/${targetSessionId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(targetSessionId);
        localStorage.setItem('sakhiguide_session_id', targetSessionId);
        if (data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m) => ({
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          );
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message to backend
  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Append user message immediately to UI
    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setGlobalError(null);

    try {
      // Ensure we have a valid session id
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const sessionRes = await fetch(`${API_BASE}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ language }),
        });
        const sessionData = await sessionRes.json();
        currentSessionId = sessionData.sessionId;
        setSessionId(currentSessionId);
        localStorage.setItem('sakhiguide_session_id', currentSessionId);
      }

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: text,
          language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error communicating with Evara AI server.');
      }

      const data = await res.json();

      // Assistant message with full structured metadata
      const assistantMsg = {
        role: 'assistant',
        content: data.reply_text,
        detected_language: data.detected_language,
        triageData: {
          triage_level: data.triage_level,
          suggested_specialist: data.suggested_specialist,
          symptoms: data.symptoms,
          commonly_discussed_tests: data.commonly_discussed_tests,
          questions_for_doctor: data.questions_for_doctor,
        },
        follow_up_question: data.follow_up_question,
        redFlagTriggered: data.redFlagTriggered,
        redFlagDetail: data.redFlagDetail,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setGlobalError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      localStorage.removeItem('sakhiguide_session_id');
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('sakhiguide_session_id', data.sessionId);
        setMessages([]);
        setGlobalError(null);
      }
    } catch (err) {
      console.error('Error starting new session:', err);
    }
  };

  return (
    <div className="app-layout">
      {/* Top Navbar */}
      <Navbar
        language={language}
        onSelectLanguage={handleLanguageChange}
        onNewSession={startNewSession}
      />

      {/* Global Error Toast if any */}
      {globalError && (
        <div className="global-error-toast" role="alert">
          <span>⚠️ {globalError}</span>
          <button
            onClick={() => setGlobalError(null)}
            className="error-close-btn"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Routed Content */}
      <main className="app-main-content">
        <Routes>
          {/* Main Chat View */}
          <Route
            path="/"
            element={
              <>
                <ChatWindow
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  language={language}
                  onSelectLanguage={handleLanguageChange}
                  onOpenReport={() => navigate(`/report/${sessionId}`)}
                />
                <DisclaimerBanner text={t.disclaimer} />
              </>
            }
          />

          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage language={language} />} />
          <Route path="/register" element={<RegisterPage language={language} />} />

          {/* Protected Routes */}
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage
                  language={language}
                  onSelectSession={loadExistingSession}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage
                  language={language}
                  onSelectLanguage={handleLanguageChange}
                />
              </ProtectedRoute>
            }
          />

          {/* Doctor Summary Report View */}
          <Route
            path="/report/:sessionId"
            element={<DoctorSummaryPageWrapper language={language} />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
