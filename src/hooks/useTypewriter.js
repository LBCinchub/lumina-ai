import { useEffect, useRef, useState, useCallback } from 'react';
import { createTypewriter } from '@/lib/typewriter';

// Reveal progress per message id (session only). Infinity = finished, so a
// remount or rerender never restarts or retypes a reply.
const progress = new Map();

const prefersReduced = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useTypewriter(id, text, animate) {
  const active = !!animate && !prefersReduced() && progress.get(id) !== Infinity;
  const [shown, setShown] = useState(active ? '' : text);
  const [done, setDone] = useState(!active);
  const twRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (animate) progress.set(id, Infinity);
      setShown(text); setDone(true);
      return;
    }
    if (!twRef.current) {
      twRef.current = createTypewriter({
        startIndex: progress.get(id) || 0,
        onUpdate: (s, i) => { progress.set(id, i); setShown(s); },
        onDone: () => { progress.set(id, Infinity); setDone(true); },
      });
    }
    twRef.current.setText(text || '', true);
  }, [id, text, active, animate]);

  // Unmount / thread switch / different message: cancel pending timers.
  useEffect(() => () => { twRef.current?.stop(); twRef.current = null; }, [id]);

  const skip = useCallback(() => twRef.current?.skip(), []);
  return { shown: done ? text : shown, done, skip };
}