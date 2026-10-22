import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeAutopilot } from '@/hooks/useAutopilot';
import {
  tryAcquireLock, releaseLock, pickRunToDrive, isAuthStop, STEP_DELAY_MS,
} from '@/lib/autopilotSessionDriver';

// Single app-wide foreground driver, mounted once in the authenticated shell.
// Advances the owner's 'running' runs one server step at a time while signed
// in on any page. Stops on pause/cancel/block/approval/terminal states (server
// status), revoked auth, or bounded consecutive errors.
export function useSessionAutopilotDriver() {
  const tabId = useRef(Math.random().toString(36).slice(2));
  const errors = useRef({});

  useEffect(() => {
    let stopped = false;
    let timer = null;
    const storage = window.localStorage;

    const loop = async () => {
      if (stopped) return;
      let delay = 4000;
      try {
        if (tryAcquireLock(storage, tabId.current)) {
          const runs = await base44.entities.AutopilotRun.filter({ status: 'running' }, 'created_date', 5);
          const run = pickRunToDrive(runs, errors.current);
          if (run) {
            try {
              const res = await invokeAutopilot({ action: 'step', run_id: run.id });
              if (res?.data?.error) errors.current[run.id] = (errors.current[run.id] || 0) + 1;
              else errors.current[run.id] = 0;
            } catch (e) {
              if (isAuthStop(e)) { stopped = true; releaseLock(storage, tabId.current); return; }
              errors.current[run.id] = (errors.current[run.id] || 0) + 1;
            }
            delay = STEP_DELAY_MS;
          }
        }
      } catch (e) {
        if (isAuthStop(e)) { stopped = true; return; }
      }
      if (!stopped) timer = setTimeout(loop, delay);
    };

    timer = setTimeout(loop, 1500);
    return () => { stopped = true; clearTimeout(timer); releaseLock(storage, tabId.current); };
  }, []);
}