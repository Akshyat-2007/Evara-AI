import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BCP47_LOCALES } from '../i18n/translations.js';

export default function SpeakButton({ text, language = 'en' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }

    return () => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported || !text) return null;

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Stop any ongoing utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLocale = BCP47_LOCALES[language] || 'en-IN';
    utterance.lang = targetLocale;
    utterance.rate = 0.95; // Slightly slower for warm, clear comprehension

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang.startsWith(language) || v.lang === targetLocale || v.lang.includes(language)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleToggleSpeak}
      className={`speak-btn ${isSpeaking ? 'speaking' : ''}`}
      aria-label={isSpeaking ? 'Stop speaking aloud' : 'Read message aloud'}
      title={isSpeaking ? 'Stop speech' : 'Listen to this response'}
    >
      {isSpeaking ? (
        <>
          <VolumeX size={15} aria-hidden="true" />
          <span className="speak-label">Stop</span>
        </>
      ) : (
        <>
          <Volume2 size={15} aria-hidden="true" />
          <span className="speak-label">Listen</span>
        </>
      )}
    </button>
  );
}
