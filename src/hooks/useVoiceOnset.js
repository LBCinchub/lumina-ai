import { useEffect, useRef } from 'react';

// A second mic stream beside speech recognition is only safe in desktop Chrome
// and Edge; elsewhere she is interrupted through recognized words alone.
function supported() {
  const ua = navigator.userAgentData;
  return !!navigator.mediaDevices?.getUserMedia && !!ua?.brands?.some(b => b.brand === 'Chromium')
    && !ua.mobile && ua.platform !== 'Android';
}

const FRAME_MS = 32;
const WARMUP = 24; // frames of her voice heard before judging, to learn how loud it comes back
const HISTORY = 64; // frames of her voice that set the bar (about two seconds)
const RECENT = 8; // newest frames left out of it, so the caller's first syllables do not raise it
const SUSTAIN = 6; // frames in a row over the bar that mean the caller is talking (about 0.2s)

// Hears the caller start talking over her from the mic level alone, before any
// of their words can be recognized: a voice clearly louder than hers coming
// back from the speaker. The browser's echo cancelling removes much of that,
// and with headphones there is none.
export function useVoiceOnset({ active, speaking, onOnset }) {
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const onOnsetRef = useRef(onOnset);
  onOnsetRef.current = onOnset;

  useEffect(() => {
    if (!active || !supported()) return;
    let closed = false;
    let stream;
    let ctx;
    let timer;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((s) => {
        stream = s;
        if (closed) { s.getTracks().forEach(t => t.stop()); return; }
        ctx = new AudioContext();
        ctx.resume().catch(() => {});
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        let floor = null; // the room while she is quiet, in dB
        let hers = []; // recent levels while she speaks
        let over = 0;
        let fired = false;
        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const db = 10 * Math.log10(sum / buf.length + 1e-12);
          if (!speakingRef.current) {
            // Drops quickly to the quiet between turns, rises slowly while people talk.
            floor = floor == null ? db : floor + (db < floor ? 0.3 : 0.002) * (db - floor);
            hers = [];
            over = 0;
            fired = false;
            return;
          }
          hers.push(db);
          if (hers.length > HISTORY) hers.shift();
          if (fired || hers.length < WARMUP) return;
          const ref = hers.slice(0, -RECENT).sort((a, b) => a - b);
          const echo = ref[Math.floor(ref.length * 0.85)];
          over = db > Math.max(echo + 8, (floor ?? echo) + 15) ? over + 1 : 0;
          if (over >= SUSTAIN) {
            fired = true;
            onOnsetRef.current?.();
          }
        }, FRAME_MS);
      })
      // No second mic stream here: recognized words still interrupt her.
      .catch(() => {});
    return () => {
      closed = true;
      clearInterval(timer);
      stream?.getTracks().forEach(t => t.stop());
      ctx?.close();
    };
  }, [active]);
}