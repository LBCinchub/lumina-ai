import { useEffect } from 'react';

// Calls `refresh` every `ms` while `active`, skipping hidden tabs. Autopilot
// step progress is saved with bulk conditional writes, which do not reliably
// trigger realtime updates, so screens watching a moving run poll until it stops.
export function usePollWhile(active, refresh, ms = 4000) {
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, ms);
    return () => clearInterval(timer);
  }, [active, refresh, ms]);
}