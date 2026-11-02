import { useEffect } from 'react';

// Keeps the screen on while the calling component is shown, so a phone does
// not lock and cut a voice call off during a long pause. The browser drops the
// lock whenever the page is hidden, so it is taken again when the page returns.
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock = null;
    let done = false;
    const take = () => {
      if (done || document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen')
        .then((l) => { if (done) l.release(); else lock = l; })
        // Battery saver or an embedding frame can refuse it; the call still works.
        .catch(() => {});
    };
    take();
    document.addEventListener('visibilitychange', take);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', take);
      lock?.release();
    };
  }, []);
}