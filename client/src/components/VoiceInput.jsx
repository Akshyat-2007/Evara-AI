import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { getTranslation } from '../i18n/translations.js';

export default function VoiceInput({
  isListening,
  isSupported,
  onStart,
  onStop,
  language = 'en',
}) {
  const t = getTranslation(language);

  // If speech recognition is not supported in the browser, hide mic and show note
  if (!isSupported) {
    return (
      <div className="mic-unsupported-note" title={t.micNotSupported}>
        <small className="unsupported-text">{t.micNotSupported}</small>
      </div>
    );
  }

  return (
    <div className="voice-input-container">
      <button
        type="button"
        onClick={isListening ? onStop : onStart}
        className={`voice-mic-btn ${isListening ? 'listening-active' : ''}`}
        aria-label={isListening ? 'Stop listening' : 'Speak your symptoms'}
        title={isListening ? 'Stop listening' : 'Tap to speak your symptoms'}
      >
        {isListening ? (
          <>
            <span className="pulse-ring" aria-hidden="true" />
            <MicOff size={20} className="mic-icon" />
          </>
        ) : (
          <Mic size={20} className="mic-icon" />
        )}
      </button>
      {isListening && <span className="listening-badge">{t.listening}</span>}
    </div>
  );
}
