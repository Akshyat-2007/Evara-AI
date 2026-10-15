import React, { useEffect, useRef } from 'react';
import { Sparkles, MessageCircle } from 'lucide-react';
import TriageCard from './TriageCard.jsx';
import SpeakButton from './SpeakButton.jsx';
import PromptInputBar from './PromptInputBar.jsx';
import { getTranslation } from '../i18n/translations.js';

export default function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  language = 'en',
  onSelectLanguage,
  onOpenReport,
}) {
  const messagesEndRef = useRef(null);
  const t = getTranslation(language);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleQuickPromptClick = (prompt) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-window-container">
      {/* Messages Scroll Area */}
      <div className="messages-area" role="log" aria-live="polite">
        {!hasMessages && (
          <div className="empty-state">
            <div className="empty-state-badge">
              <Sparkles size={24} className="sparkle-icon" />
            </div>
            <h2 className="empty-state-title">{t.appName}</h2>
            <p className="empty-state-tagline">{t.tagline}</p>

            <div className="quick-prompts-container">
              <span className="quick-prompts-label">{t.quickPromptTitle}</span>
              <div className="quick-prompts-grid">
                {t.quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickPromptClick(prompt)}
                    className="quick-prompt-chip"
                  >
                    <MessageCircle size={14} className="chip-icon" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message-row ${msg.role === 'user' ? 'row-user' : 'row-assistant'}`}
          >
            <div className={`message-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
              {/* Message text */}
              <div className="bubble-text">{msg.content}</div>

              {/* Assistant specific accessories */}
              {msg.role === 'assistant' && (
                <>
                  <div className="bubble-actions">
                    <SpeakButton text={msg.content} language={msg.detected_language || language} />
                  </div>

                  {/* Render TriageCard if structured data exists */}
                  {msg.triageData && (
                    <div className="bubble-triage-container">
                      <TriageCard
                        data={msg.triageData}
                        language={msg.detected_language || language}
                        isRedFlag={msg.redFlagTriggered}
                      />
                    </div>
                  )}

                  {/* Gentle Follow-Up Question */}
                  {msg.follow_up_question && (
                    <div className="follow-up-card">
                      <span className="follow-up-label">{t.sections.followUp}</span>
                      <p className="follow-up-text">{msg.follow_up_question}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Loading / Thinking Indicator */}
        {isLoading && (
          <div className="message-row row-assistant">
            <div className="message-bubble bubble-assistant bubble-loading">
              <div className="typing-indicator" aria-label={t.thinking}>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <span className="loading-caption">{t.thinking}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Doctor Summary banner when conversation has started */}
      {hasMessages && (
        <div className="summary-bar-inline">
          <button
            type="button"
            onClick={onOpenReport}
            className="btn-create-summary"
            title="Generate a print-ready clinical summary for your doctor"
          >
            {t.createSummary}
          </button>
        </div>
      )}

      {/* Codigo-style floating prompt input bar */}
      <div className="chat-input-wrapper">
        <PromptInputBar
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          language={language}
          onSelectLanguage={onSelectLanguage}
          placeholderText={t.inputPlaceholder}
        />
      </div>
    </div>
  );
}
