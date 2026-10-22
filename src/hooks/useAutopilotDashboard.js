import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export const ACTIVE_STATUSES = ['queued', 'running', 'awaiting_input', 'awaiting_approval', 'paused', 'blocked'];

// Status totals (server aggregate) + active runs + recent runs, kept live.
export function useAutopilotDashboard() {
  const [counts, setCounts] = useState({});
  const [active, setActive] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [agg, act, rec] = await Promise.all([
        base44.entities.AutopilotRun.aggregate({ groupBy: 'status' }),
        base44.entities.AutopilotRun.filter({ status: { $in: ACTIVE_STATUSES } }, { sort: '-updated_date', limit: 30 }),
        base44.entities.AutopilotRun.list({ sort: '-updated_date', limit: 20 }),
      ]);
      setCounts(Object.fromEntries((agg?.rows || []).map(r => [r.status, r.count])));
      setActive(act?.items || []);
      setRecent(rec?.items || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return base44.entities.AutopilotRun.subscribe(() => refresh());
  }, [refresh]);

  return { counts, active, recent, loading };
}