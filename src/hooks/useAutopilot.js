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

// Step driving lives in useSessionAutopilotDriver (one app-wide driver).