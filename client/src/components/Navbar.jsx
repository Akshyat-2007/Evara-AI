import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, User, LogOut, LogIn, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { getTranslation } from '../i18n/translations.js';

export default function Navbar({ language, onSelectLanguage, onNewSession }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const t = getTranslation(language);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <header className="app-navbar" role="banner">
      <div className="navbar-container">
        {/* Brand Link */}
        <Link to="/" className="brand-group" title="Evara AI - Return to Chat">
          <span className="brand-avatar" aria-hidden="true">🌸</span>
          <div className="brand-text">
            <span className="brand-name">{t.appName}</span>
            <span className="brand-tagline">{t.tagline}</span>
          </div>
        </Link>

        {/* Navigation Controls */}
        <div className="nav-controls">
          {/* Language Selector */}
          <LanguageSelector
            currentLanguage={language}
            onSelectLanguage={onSelectLanguage}
          />

          {/* Authenticated Controls */}
          {isAuthenticated ? (
            <div className="nav-user-actions">
              <Link to="/history" className="btn-nav-action" title="View your past symptom logs">
                <History size={15} />
                <span>History</span>
              </Link>

              <Link to="/profile" className="btn-nav-action" title="Manage your account profile">
                <User size={15} />
                <span className="nav-user-name">{displayName}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-nav-logout"
                title="Log out of your account"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            /* Guest Controls */
            <div className="nav-guest-actions">
              {onNewSession && (
                <button
                  type="button"
                  onClick={onNewSession}
                  className="btn-new-chat"
                  title="Start a fresh anonymous session"
                >
                  <PlusCircle size={14} />
                  <span>New Chat</span>
                </button>
              )}

              <Link to="/login" className="btn-nav-login" title="Log in to save your history">
                <LogIn size={15} />
                <span>Log In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
