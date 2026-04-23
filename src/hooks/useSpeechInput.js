import { useState, useRef, useCallback } from 'react';

export function useSpeechInput({ onTranscript, onAutoSubmit, onBargeIn }) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');
  const shouldRestartRef = useRef(false); // keep alive flag

  // Always-current refs — updated synchronously on every render
  const onTranscriptRef = useRef(onTranscript);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onBargeInRef = useRef(onBargeIn);
  onTranscriptRef.current = onTranscript;
  onAutoSubmitRef.current = onAutoSubmit;
  onBargeInRef.current = onBargeIn;
  const bargedInRef = useRef(false);

  const createAndStart = useCallback(() => {
    if (!supported) return;
    if (recognitionRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false; // single utterance per session; we restart manually
    rec.maxAlternatives = 1;

    accumulatedRef.current = '';
    bargedInRef.current = false;

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
      const transcript = (final + interim).trim();

      // Barge-in: if Lumina is speaking and user starts talking, interrupt her
      if (!bargedInRef.current && transcript.length > 0 && onBargeInRef.current) {
        bargedInRef.current = true;
        onBargeInRef.current();
      }

      onTranscriptRef.current(transcript);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = '';

      if (text) {
        // User said something — submit it (this will also interrupt Lumina if speaking)
        onAutoSubmitRef.current(text);
      } else if (shouldRestartRef.current) {
        // No speech detected, but we're still in live mode — restart immediately
        setTimeout(() => {
          if (shouldRestartRef.current) createAndStart();
        }, 150);
      }
    };

    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error);
      }
      setListening(false);
      recognitionRef.current = null;
      // Auto-restart on no-speech so we keep listening
      if (shouldRestartRef.current && e.error === 'no-speech') {
        setTimeout(() => {
          if (shouldRestartRef.current) createAndStart();
        }, 150);
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch (_) {}
  }, [supported]);

  const start = useCallback(() => {
    shouldRestartRef.current = true;
    createAndStart();
  }, [createAndStart]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (shouldRestartRef.current) stop();
    else start();
  }, [start, stop]);

  // Called after Lumina finishes speaking to restart listening
  const restart = useCallback(() => {
    if (!shouldRestartRef.current) return;
    if (recognitionRef.current) return; // already running
    setTimeout(() => {
      if (shouldRestartRef.current) createAndStart();
    }, 200);
  }, [createAndStart]);

  return { listening, supported, toggle, start, stop, restart };
}