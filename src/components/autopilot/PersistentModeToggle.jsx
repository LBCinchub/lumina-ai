import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { invokeAutopilot } from '@/hooks/useAutopilot';
import { createModeController } from '@/lib/autopilotModeController';

export default function PersistentModeToggle({ onConfirmedChange }) {
  const [s, setS] = useState({ enabled: null, loading: true, saving: false, error: null });
  const ctl = useMemo(() => createModeController(invokeAutopilot, setS), []);
  useEffect(() => { ctl.load(); }, [ctl]);
  useEffect(() => { onConfirmedChange?.(s.enabled); }, [s.enabled, onConfirmedChange]);

  const status = s.loading ? 'Loading…' : s.saving ? 'Saving…'
    : s.enabled === true ? 'On — Saved. Background Setup Required.' : s.enabled === false ? 'Off — Runs Advance Only While This Screen Is Open.' : 'Unavailable';

  return (
    <div className="text-right shrink-0 max-w-[220px]">
      <label htmlFor="persistent-mode" className="text-xs text-muted-foreground">Persistent Mode</label>
      <div><Switch id="persistent-mode" aria-busy={s.loading || s.saving} checked={s.enabled === true}
        disabled={s.loading || s.saving || s.enabled === null} onCheckedChange={(v) => ctl.save(v)} /></div>
      <div className="text-[11px] text-muted-foreground mt-1" aria-live="polite">{status}</div>
      {s.enabled === true && s.background?.blocker && (
        <div className="text-[11px] text-muted-foreground mt-1">{s.background.blocker}</div>
      )}
      {s.error && (
        <div role="alert" className="text-[11px] text-destructive mt-1">
          {s.error} <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => ctl.retry()}>Retry</Button>
        </div>
      )}
    </div>
  );
}