import { useState, useEffect, useRef, useCallback } from 'react';
import { BCP47_LOCALES } from '../i18n/translations.js';

/**
 * Custom hook for browser Web Speech Recognition
 * Maps selected language to BCP-47 locale (hi-IN, kn-IN, ta-IN, te-IN, mr-IN, bn-IN, en-IN)
 * Supports continuous speech and real-time interim additions
 */
export default function useSpeechRecognition({ language = 'en', onResultText, onInterimText } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const recognitionRef = useRef(null);
  const onResultTextRef = useRef(onResultText);
  const onInterimTextRef = useRef(onInterimText);

  useEffect(() => {
    onResultTextRef.current = onResultText;
    onInterimTextRef.current = onInterimText;
  }, [onResultText, onInterimText]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening so user can speak multiple phrases/sentences
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const currentSpeech = finalChunk || interim;
        setTranscript(currentSpeech);

        if (interim && onInterimTextRef.current) {
          onInterimTextRef.current(interim);
        }

        if (finalChunk && onResultTextRef.current) {
          onResultTextRef.current(finalChunk.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setErrorMessage(`Microphone error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Update recognition locale whenever selected language changes
  useEffect(() => {
    if (recognitionRef.current) {
      const locale = BCP47_LOCALES[language] || 'en-IN';
      recognitionRef.current.lang = locale;
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      setTranscript('');
      setErrorMessage(null);
      const locale = BCP47_LOCALES[language] || 'en-IN';
      recognitionRef.current.lang = locale;
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }, [isListening, language]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Recognition stop error:', err);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
  };
}
