import { useState, useRef, useCallback } from 'react';
import { echoFor, userSpeechStart } from '@/lib/echoGuard';

// Errors that would repeat on every automatic retry: listening stops and the
// call screen says what to do. 'no-speech' and 'aborted' are routine.
const BLOCKED = 'Microphone Access Is Blocked. Allow It For This Site In Your Browser Settings, Then Try Again.';
const MIC_ERRORS = {
  'not-allowed': BLOCKED,
  'service-not-allowed': BLOCKED,
  'audio-capture': 'No Microphone Was Found. Connect One, Then Try Again.',
  'network': 'Voice Input Could Not Reach Its Speech Service. Check Your Connection, Then Try Again.',
};
const START_FAILED = 'Voice Input Stopped Unexpectedly. Try Again.';
const UNSUPPORTED = { message: 'Voice Input Is Not Supported In This Browser. Try Chrome, Edge Or Safari, Or Type Below.', canRetry: false };

export function useSpeechInput({ onTranscript, onAutoSubmit, onBargeIn, getSpoken }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null); // { message, canRetry } when listening cannot continue
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
  const getSpokenRef = useRef(getSpoken); // what she is saying, to tell her voice from the caller's
  getSpokenRef.current = getSpoken;
  const bargedInRef = useRef(false);
  const keepFromRef = useRef(0); // words before this index were her own voice
  const sessionStartRef = useRef(0);
  const eagerRef = useRef(false); // the mic level already showed the caller talking over her

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
    keepFromRef.current = 0;
    sessionStartRef.current = Date.now();
    eagerRef.current = false;

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
      const finalWords = final.trim().split(/\s+/).filter(Boolean);
      const words = [...finalWords, ...interim.trim().split(/\s+/).filter(Boolean)];

      // Barge-in: the caller talking stops her at once. While she speaks the
      // mic also hears her, so only words she is not saying count as the
      // caller, and her own words are left out of what gets sent.
      if (!bargedInRef.current) {
        const echo = echoFor(getSpokenRef.current?.(), sessionStartRef.current);
        const from = echo ? userSpeechStart(words, echo, eagerRef.current) : keepFromRef.current;
        if (from >= 0 && from < words.length) {
          keepFromRef.current = from;
          bargedInRef.current = true;
          onBargeInRef.current?.();
        } else if (echo) {
          keepFromRef.current = words.length;
        }
      }

      accumulatedRef.current = finalWords.slice(keepFromRef.current).join(' ');
      onTranscriptRef.current(words.slice(keepFromRef.current).join(' '));
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
      setListening(false);
      recognitionRef.current = null;
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        // Restarting on our own would hit the same error in a loop.
        shouldRestartRef.current = false;
        setError({ message: MIC_ERRORS[e.error] || START_FAILED, canRetry: true });
        return;
      }
      // Auto-restart on no-speech so we keep listening
      if (shouldRestartRef.current && e.error === 'no-speech') {
        setTimeout(() => {
          if (shouldRestartRef.current) createAndStart();
        }, 150);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (_) {
      recognitionRef.current = null;
      shouldRestartRef.current = false;
      setError({ message: START_FAILED, canRetry: true });
    }
  }, [supported]);

  const start = useCallback(() => {
    if (!supported) { setError(UNSUPPORTED); return; }
    setError(null);
    shouldRestartRef.current = true;
    createAndStart();
  }, [supported, createAndStart]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setListening(false);
    setError(null);
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

  // The mic level heard the caller start talking over her: their first word
  // she is not saying begins what they say.
  const callerStarted = useCallback(() => { eagerRef.current = true; }, []);

  return { listening, supported, error, toggle, start, stop, restart, callerStarted };
}