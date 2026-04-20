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
  // Priority: best natural female voices first
  return (
    voices.find(v => v.name === 'Samantha') ||           // macOS/iOS - warm, natural
    voices.find(v => v.name === 'Karen') ||              // macOS Australian female
    voices.find(v => v.name === 'Serena') ||             // macOS enhanced female
    voices.find(v => v.name === 'Moira') ||              // macOS Irish female
    voices.find(v => v.name === 'Tessa') ||              // macOS South African female
    voices.find(v => v.name === 'Fiona') ||              // macOS Scottish female
    voices.find(v => v.name.includes('Google UK English Female')) ||
    voices.find(v => v.name.includes('Google US English Female')) ||
    voices.find(v => v.name.includes('Microsoft Zira')) ||   // Windows natural female
    voices.find(v => v.name.includes('Microsoft Jenny')) ||  // Windows neural female
    voices.find(v => v.name.includes('Microsoft Aria')) ||   // Windows neural female
    voices.find(v => v.lang === 'en-US' && /female|woman/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-GB' && /female|woman/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-US' && !v.localService === false) || // prefer network/neural
    voices.find(v => v.lang === 'en-US') ||
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
      utter.rate = 0.95;   // slightly slower = more natural
      utter.pitch = 1.1;   // slightly higher = feminine, warm
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