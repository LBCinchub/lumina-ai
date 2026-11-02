import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// The signed-in user's own twin profile and authorization settings, read and
// written only through the twin engine (owner-scoped on the server).
export function useTwinProfile() {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('lbcTwinEngine', { action: 'get_profile' });
      setProfile(res.data?.profile || null);
      setSettings(res.data?.settings || null);
    } catch (_) {
      setError('Your Twin Could Not Be Loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStyle = useCallback(async (style) => {
    if (!profile || profile.communication_style === style) return;
    setProfile({ ...profile, communication_style: style });
    try {
      await base44.functions.invoke('lbcTwinEngine', { action: 'update_settings', communication_style: style });
    } catch (_) {
      setProfile(profile); // the server kept the previous style
    }
  }, [profile]);

  return { profile, settings, loading, error, reload: load, setStyle };
}