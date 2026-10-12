import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Real, server-stored memory consent state. `saving` / `error` reflect the
// actual write; the UI never shows a change as saved before the server confirms.
export function useMemorySettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await base44.functions.invoke('manageUserMemory', { action: 'list' });
      setSettings(res?.data?.settings || null);
      return res?.data;
    } catch (_) {
      setError('Could Not Load Memory Settings.');
      return null;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (patch) => {
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('manageUserMemory', { action: 'setSettings', settings: patch });
      setSettings(res.data.settings);
    } catch (_) {
      setError('Could Not Save — Your Previous Setting Is Still Active.');
    }
    setSaving(false);
  };

  return { settings, saving, error, update, reload: load };
}