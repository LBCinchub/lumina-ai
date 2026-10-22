import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { invokeAutopilot } from '@/hooks/useAutopilot';
import { StatusPill } from '@/components/autopilot/dashboard/statusMeta';
import TaskRunCard from '@/components/autopilot/TaskRunCard';
import { taskCardSummary } from '@/lib/chatTaskSummary';

// Compact in-chat card for a delegated Autopilot run. Reads the real saved
// run (owner RLS), live-updates, and reuses the existing approval controls.
export default function ChatTaskCard({ runId }) {
  const [run, setRun] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const rows = await base44.entities.AutopilotRun.filter({ id: runId }).catch(() => []);
    setRun(rows?.[0] || null);
  }, [runId]);

  useEffect(() => {
    load();
    return base44.entities.AutopilotRun.subscribe((e) => { if (e.id === runId) load(); });
  }, [runId, load]);

  const call = async (payload) => {
    setBusy(true); setError(null);
    try {
      const res = await invokeAutopilot(payload);
      if (res?.data?.error) setError(res.data.error);
    } catch (e) {
      setError(e?.response?.data?.error || 'Action Failed');
    } finally { setBusy(false); load(); }
  };

  if (run === undefined) return <div className="mt-3 text-xs text-muted-foreground">Loading Task…</div>;
  if (run === null) return <div className="mt-3 text-xs text-muted-foreground">This Task Is No Longer Available.</div>;

  const s = taskCardSummary(run);
  return (
    <div className="mt-3 rounded-xl border border-border bg-card not-prose">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center gap-3 px-3 py-2.5 text-left min-h-[44px]">
        <StatusPill status={run.status} />
        <span className="flex-1 min-w-0 text-sm truncate">{s.headline}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{s.progress}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {s.nextStep && <p className="px-3 pb-2 text-xs text-muted-foreground">{s.nextStep}</p>}
      {s.documentId && <p className="px-3 pb-2 text-xs"><Link to="/knowledge" className="text-primary underline">Open The Saved Document</Link></p>}
      {error && <p role="alert" className="px-3 pb-2 text-xs text-destructive">{error}</p>}
      {open && (
        <div className="border-t border-border p-3 space-y-2">
          <TaskRunCard run={run} busy={busy} onAction={(action, id) => call({ action, run_id: id })} onAnswer={(id, answer) => call({ action: 'answer', run_id: id, answer })} />
          {run.status === 'awaiting_approval' && <Link to="/autopilot" className="text-xs text-primary underline">Edit The Draft In Autopilot (Editing Resets Approval)</Link>}
        </div>
      )}
    </div>
  );
}