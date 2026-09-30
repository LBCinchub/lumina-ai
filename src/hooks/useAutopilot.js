import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function invokeAutopilot(payload) {
  return base44.functions.invoke('autopilot', payload);
}

// Live run record via RLS-scoped entity reads + realtime updates.
export function useAutopilotRuns(limit = 15) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await base44.entities.AutopilotRun.list('-created_date', limit);
      setRuns(rows || []);
    } catch (_) {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
    const unsubscribe = base44.entities.AutopilotRun.subscribe(() => refresh());
    return unsubscribe;
  }, [refresh]);

  return { runs, loading, refresh };
}

// One bound execution step per poll — a foreground driver, never a fake
// background worker. Stops as soon as the run is not 'running'.
export function useAutopilotDriver(run, refresh) {
  const [stepping, setStepping] = useState(false);
  const status = run?.status;
  const runId = run?.id;

  useEffect(() => {
    if (status !== 'running' || !runId || stepping) return;
    let cancelled = false;
    const tick = async () => {
      setStepping(true);
      try {
        await invokeAutopilot({ action: 'step', run_id: runId });
      } finally {
        if (!cancelled) {
          setStepping(false);
          refresh();
        }
      }
    };
    const t = setTimeout(tick, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status, runId, stepping, refresh]);

  return stepping;
}