import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ArrowUp,
  Sparkles,
  RotateCcw,
  Check,
  Edit3,
  Plus,
  Calendar,
  Activity,
  AlertCircle,
} from 'lucide-react';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import { getTranslation, SUPPORTED_LANGUAGES } from '../i18n/translations.js';

export default function PromptInputBar({
  onSendMessage,
  isLoading,
  language = 'en',
  onSelectLanguage,
  placeholderText,
}) {
  const [text, setText] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [spokenConfirmation, setSpokenConfirmation] = useState(null); // { newlySpoken: string, fullText: string }

  const textareaRef = useRef(null);
  const baseTextRef = useRef(''); // Holds existing text prior to current speech turn
  const accumulatedSpeechRef = useRef(''); // Holds newly spoken speech from this session

  const t = getTranslation(language);

  // Web Speech recognition hook
  const {
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language,
    onInterimText: (interim) => {
      // Real-time interim preview: add the interim text to existing baseText
      const base = baseTextRef.current ? `${baseTextRef.current} ` : '';
      const accumulated = accumulatedSpeechRef.current ? `${accumulatedSpeechRef.current} ` : '';
      setText(`${base}${accumulated}${interim}`.trim());
    },
    onResultText: (finalChunk) => {
      // When a final spoken chunk is recognized, ADD it to the accumulated speech
      accumulatedSpeechRef.current = accumulatedSpeechRef.current
        ? `${accumulatedSpeechRef.current} ${finalChunk}`
        : finalChunk;

      const base = baseTextRef.current ? `${baseTextRef.current} ` : '';
      const fullText = `${base}${accumulatedSpeechRef.current}`.trim();
      setText(fullText);

      // Present confirmation with what was newly added
      setSpokenConfirmation({
        newlySpoken: accumulatedSpeechRef.current,
        fullText,
      });
    },
  });

  // Adjust textarea height dynamically to content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    if (isListening) {
      stopListening();
    }
    setSpokenConfirmation(null);
    onSendMessage(trimmed);
    setText('');
    baseTextRef.current = '';
    accumulatedSpeechRef.current = '';
    resetTranscript();
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      if (accumulatedSpeechRef.current || text.trim()) {
        setSpokenConfirmation({
          newlySpoken: accumulatedSpeechRef.current || text.trim(),
          fullText: text.trim(),
        });
      }
    } else {
      // Start recording: preserve whatever text is currently in the box as baseText
      baseTextRef.current = text.trim();
      accumulatedSpeechRef.current = '';
      setSpokenConfirmation(null);
      resetTranscript();
      startListening();
    }
  };

  const handleDismissConfirmation = () => {
    setSpokenConfirmation(null);
    textareaRef.current?.focus();
  };

  const handleClear = () => {
    setText('');
    baseTextRef.current = '';
    accumulatedSpeechRef.current = '';
    setSpokenConfirmation(null);
    resetTranscript();
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }
  };

  // Append suggestion prompt to current text instead of overwriting
  const handleAddChipPrompt = (prompt) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}, ${prompt}` : prompt));
    textareaRef.current?.focus();
  };

  const hasText = text.trim().length > 0;

  // Codigo-style suggestion chips
  const suggestionChips = [
    {
      icon: <Calendar size={14} />,
      label: language === 'hi' ? '+ अनियमित पीरियड्स' : (language === 'kn' ? '+ ಮುಟ್ಟು ತಡವಾಗುವುದು' : '+ Irregular periods'),
      prompt: language === 'hi' 
        ? 'periods late aate hain' 
        : (language === 'kn' ? 'ತಿಂಗಳು ಸರಿಯಾಗಿ ಬರ್ತಿಲ್ಲ' : 'irregular periods'),
    },
    {
      icon: <Activity size={14} />,
      label: language === 'hi' ? '+ बाल झड़ना & मुहासे' : (language === 'kn' ? '+ ಕೂದಲು ಉದುರುವುದು' : '+ Hair fall & acne'),
      prompt: language === 'hi'
        ? 'baal jhad rahe hain, face pe pimples'
        : (language === 'kn' ? 'ಕೂದಲು ಉದುರುತ್ತಿದೆ ಮತ್ತು ಮೊಡವೆ ಇದೆ' : 'hair fall and facial acne'),
    },
    {
      icon: <AlertCircle size={14} />,
      label: language === 'hi' ? '+ वजन & थकान' : (language === 'kn' ? '+ ತೂಕ ಹೆಚ್ಚಳ' : '+ Weight & fatigue'),
      prompt: language === 'hi'
        ? 'wajan badh raha hai aur thakan rehti hai'
        : (language === 'kn' ? 'ತೂಕ ಹೆಚ್ಚಾಗುತ್ತಿದೆ ಮತ್ತು ಆಯಾಸವಾಗುತ್ತಿದೆ' : 'weight gain and constant fatigue'),
    },
  ];

  return (
    <div className="codigo-prompt-container">
      {/* 1. Spoken Confirmation Banner: Writes spoken text into input and asks to send */}
      <AnimatePresence>
        {spokenConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="spoken-confirm-banner"
            role="region"
            aria-live="polite"
          >
            <div className="spoken-confirm-header">
              <span className="mic-indicator-dot" />
              <span className="spoken-confirm-label">
                <strong>Text Added from Voice!</strong> Would you like to send this to Evara AI now?
              </span>
            </div>

            <div className="spoken-preview-quote">
              “{spokenConfirmation.fullText}”
            </div>

            <div className="spoken-confirm-actions">
              <button
                type="button"
                onClick={handleSend}
                className="btn-confirm-send"
                disabled={isLoading}
              >
                <Check size={16} />
                <span>Yes, Send Now</span>
              </button>

              <button
                type="button"
                onClick={handleVoiceToggle}
                className="btn-confirm-edit"
                title="Tap mic to speak and add more text"
              >
                <Plus size={15} />
                <span>Speak More (Add)</span>
              </button>

              <button
                type="button"
                onClick={handleDismissConfirmation}
                className="btn-confirm-edit"
              >
                <Edit3 size={15} />
                <span>Edit with Keyboard</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="btn-confirm-discard"
              >
                <RotateCcw size={14} />
                <span>Clear</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Modern Codigo-Style Floating Input Box */}
      <div className={`codigo-input-card ${isListening ? 'listening-glow' : ''}`}>
        <textarea
          ref={textareaRef}
          placeholder={
            isListening 
              ? '🎙️ Listening... speak naturally in your language (speech is added here)...' 
              : (placeholderText || t.inputPlaceholder)
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            baseTextRef.current = e.target.value;
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
          className="codigo-textarea"
          aria-label="Symptom inquiry input"
        />

        {/* Toolbar row inside the box */}
        <div className="codigo-toolbar">
          {/* Left tools */}
          <div className="codigo-toolbar-left">
            {hasText && (
              <button
                type="button"
                onClick={handleClear}
                className="codigo-icon-btn clear-btn"
                title="Clear input"
                aria-label="Clear input"
              >
                <RotateCcw size={16} />
              </button>
            )}

            {/* Language indicator pill */}
            <div className="codigo-lang-pill">
              <span className="lang-dot" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
                className="codigo-lang-select"
                aria-label="Change language"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right actions: Mic & Animated Send button */}
          <div className="codigo-toolbar-right">
            {/* Microphone Button with Tooltip */}
            <div
              className="mic-btn-wrapper"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <AnimatePresence>
                {showTooltip && !isListening && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="codigo-tooltip"
                  >
                    {isSpeechSupported ? 'Speak to add text' : 'Mic unavailable'}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`codigo-mic-btn ${isListening ? 'active-listening' : ''}`}
                aria-label={isListening ? 'Stop listening' : 'Start speaking'}
                title={isListening ? 'Stop recording & add text' : 'Voice Input (speak to add text)'}
              >
                {isListening ? (
                  <>
                    <span className="pulse-mic-wave" />
                    <MicOff size={18} />
                  </>
                ) : (
                  <Mic size={18} />
                )}
              </button>
            </div>

            {/* Animated Send Button (Appears when text is present) */}
            <AnimatePresence>
              {hasText && (
                <motion.button
                  key="send-btn"
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.16 }}
                  className="codigo-send-btn"
                  aria-label="Send message"
                  title="Send message"
                >
                  <ArrowUp size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 3. Codigo Labels / Chips row */}
      <div className="codigo-chips-row">
        {suggestionChips.map((chip, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleAddChipPrompt(chip.prompt)}
            className="codigo-chip"
            title="Click to add this symptom to your message"
          >
            <span className="chip-icon">{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
