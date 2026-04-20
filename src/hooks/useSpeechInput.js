import { useState, useRef, useCallback } from 'react';

export function useSpeechInput({ onTranscript, onAutoSubmit }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');

  // Always-current refs — updated synchronously on every render
  const onTranscriptRef = useRef(onTranscript);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onTranscriptRef.current = onTranscript;
  onAutoSubmitRef.current = onAutoSubmit;

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    if (recognitionRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    accumulatedRef.current = '';

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += t + ' ';
        } else {
          interim = t;
        }
      }
      accumulatedRef.current = final;
      onTranscriptRef.current((final + interim).trim());
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      if (text) {
        onAutoSubmitRef.current(text);
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error);
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
  }, [supported]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { listening, supported, toggle, start, stop };
}