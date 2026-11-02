import { useCallback, useRef, useState } from 'react';

export function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
}

function getBestVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Priority: Canadian accent first, then most expressive neural voices
  return (
    voices.find(v => v.name.includes('Samantha') && v.lang === 'en-CA') ||
    voices.find(v => v.lang === 'en-CA') ||              // any Canadian English voice
    voices.find(v => v.name === 'Serena') ||             // macOS enhanced — most expressive
    voices.find(v => v.name === 'Samantha') ||           // macOS/iOS — warm, natural
    voices.find(v => v.name.includes('Microsoft Aria')) ||   // Windows neural — very expressive
    voices.find(v => v.name.includes('Microsoft Jenny')) ||  // Windows neural female
    voices.find(v => v.name.includes('Microsoft Emma')) ||   // Windows neural female
    voices.find(v => v.name === 'Karen') ||              // macOS Australian
    voices.find(v => v.name === 'Moira') ||              // macOS Irish — emotional cadence
    voices.find(v => v.name === 'Tessa') ||              // macOS South African
    voices.find(v => v.name === 'Fiona') ||              // macOS Scottish
    voices.find(v => v.name.includes('Google UK English Female')) ||
    voices.find(v => v.name.includes('Google US English Female')) ||
    voices.find(v => v.name.includes('Microsoft Zira')) ||
    voices.find(v => v.lang === 'en-US' && /female|woman/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-GB' && /female|woman/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-CA') ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en'))
  );
}


export function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const onEndRef = useRef(null);
  const stoppedRef = useRef(false); // true when stop() was called manually
  const tokenRef = useRef(0); // latest speak() call; callbacks of older ones are ignored

  // Call this on a direct user gesture (e.g. clicking the voice button)
  // to unlock the browser's speech synthesis autoplay policy
  const unlock = useCallback(() => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance('');
    utter.volume = 0;
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback((text, onEnd) => {
    const synth = window.speechSynthesis;
    const clean = stripMarkdown(String(text || ''));
    // Nothing can be played: hand back at once so a voice call keeps going.
    if (!synth || !clean) { onEnd?.(); return; }

    const token = ++tokenRef.current;
    stoppedRef.current = false;
    onEndRef.current = onEnd;
    synth.cancel();
    const current = () => token === tokenRef.current && !stoppedRef.current;
    // Finished, or failed to play: either way the call moves on, once.
    const done = () => {
      if (!current()) return; // manual stop or a newer reply — do nothing
      setSpeaking(false);
      const cb = onEndRef.current;
      onEndRef.current = null;
      cb?.();
    };

    const doSpeak = () => {
      if (!current()) return;
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 1;

      const voice = getBestVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => { if (current()) setSpeaking(true); };
      utter.onend = done;
      utter.onerror = done;

      synth.speak(utter);
    };

    // Voices may load late, or never on some systems: wait up to a second,
    // then speak with the default voice.
    if (synth.getVoices().length > 0) { doSpeak(); return; }
    let begun = false;
    const begin = () => {
      if (begun) return;
      begun = true;
      synth.onvoiceschanged = null;
      doSpeak();
    };
    synth.onvoiceschanged = begin;
    setTimeout(begin, 1000);
  }, []);

  const stop = useCallback(() => {
    if (!window.speechSynthesis) return;
    stoppedRef.current = true; // block any pending onend/onerror callbacks
    onEndRef.current = null;
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.cancel(), 50);
    setTimeout(() => window.speechSynthesis.cancel(), 150);
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, unlock };
}