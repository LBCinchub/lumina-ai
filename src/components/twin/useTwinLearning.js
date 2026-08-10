import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Fire-and-forget twin learning. Never blocks the user experience and never
// throws into the calling flow.
export function useTwinLearning() {
  const logInteraction = useCallback((vertical, action_type, action_data) => {
    try {
      base44.functions
        .invoke('lbcTwinEngine', {
          action: 'learn_from_interaction',
          vertical,
          action_type,
          action_data: action_data || {}
        })
        .catch(() => {});
    } catch (_) {
      /* swallow */
    }
  }, []);

  return { logInteraction };
}