import { useCallback, useRef, useState } from 'react';

function stripMarkdown(text) {
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
  return (
    voices.find(v => v.name === 'Samantha') ||
    voices.find(v => v.name === 'Karen') ||
    voices.find(v => v.name === 'Moira') ||
    voices.find(v => v.name.includes('Google US English')) ||
    voices.find(v => v.lang === 'en-US' && !v.name.includes('Male')) ||
    voices.find(v => v.lang.startsWith('en'))
  );
}

export function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const onEndRef = useRef(null);

  // Call this on a direct user gesture (e.g. clicking the voice button)
  // to unlock the browser's speech synthesis autoplay policy
  const unlock = useCallback(() => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance('');
    utter.volume = 0;
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const clean = stripMarkdown(text);
    if (!clean) return;

    onEndRef.current = onEnd;

    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.pitch = 1.05;
      utter.volume = 1;

      const voice = getBestVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => {
        setSpeaking(false);
        onEndRef.current?.();
      };
      utter.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setSpeaking(false);
        onEndRef.current?.();
      };

      window.speechSynthesis.speak(utter);
    };

    // Voices may not be loaded yet — wait if needed
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, unlock };
}