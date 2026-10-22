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

  // Readiness is shown only from the server's `background` response; never assumed.
  const bg = s.background;
  const readiness = !bg ? 'Not Reported' : bg.ready === true ? 'Ready' : 'Not Ready';

  return (
    <div className="rounded-xl border border-border bg-card p-4 grid gap-4 sm:grid-cols-2">
      <div>
        <div className="text-[11px] font-medium text-muted-foreground">Saved Preference</div>
        <div className="flex items-center gap-3 mt-1.5">
          <Switch id="persistent-mode" aria-busy={s.loading || s.saving} checked={s.enabled === true}
            disabled={s.loading || s.saving || s.enabled === null} onCheckedChange={(v) => ctl.save(v)} />
          <label htmlFor="persistent-mode" className="text-sm font-medium">Persistent Mode</label>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5" aria-live="polite">{status}</div>
      </div>
      <div className="sm:border-l sm:border-border sm:pl-4">
        <div className="text-[11px] font-medium text-muted-foreground">Background Execution</div>
        <div className={`inline-flex mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${bg?.ready === true ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'}`}>{readiness}</div>
        {bg?.blocker && <div className="text-xs text-muted-foreground mt-1.5">{bg.blocker}</div>}
      </div>
      {s.error && (
        <div role="alert" className="text-[11px] text-destructive mt-1">
          {s.error} <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => ctl.retry()}>Retry</Button>
        </div>
      )}
    </div>
  );
}