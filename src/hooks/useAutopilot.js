import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { usePollWhile } from '@/hooks/usePollWhile';

export function invokeAutopilot(payload) {
  return base44.functions.invoke('autopilot', payload);
}

export const isMovingRun = (r) => r?.status === 'queued' || r?.status === 'running';

// Live run record via RLS-scoped entity reads + realtime updates.
export function useAutopilotRuns(limit = 15) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await base44.entities.AutopilotRun.list('-created_date', limit);
      setRuns(rows || []);
    } catch (_) {
      // Keep the last good list; the next refresh retries.
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
    const unsubscribe = base44.entities.AutopilotRun.subscribe(() => refresh());
    return unsubscribe;
  }, [refresh]);
  usePollWhile(runs.some(isMovingRun), refresh);

  return { runs, loading, refresh };
}

// Step driving lives in useSessionAutopilotDriver (one app-wide driver).