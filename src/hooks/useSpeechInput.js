import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechInput({ onTranscript, onAutoSubmit }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const accumulatedRef = useRef(''); // persists across closure

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);

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
    rec.continuous = true;      // keep listening through pauses
    rec.maxAlternatives = 1;

    accumulatedRef.current = ''; // reset on new session

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let interim = '';
      // Rebuild full transcript from all results
      let final = '';
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
      // On no-speech, just restart automatically if still in listening mode
      if (e.error === 'no-speech' && recognitionRef.current) {
        // will trigger onend which cleans up; if accumulated text exists, submit it
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    rec.start();
  }, [supported]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  return { listening, supported, toggle, start, stop };
}