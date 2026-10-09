import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { invokeAutopilot, useAutopilotRuns, useAutopilotDriver } from '@/hooks/useAutopilot';
import CapabilityMatrix from '@/components/autopilot/CapabilityMatrix';
import ConnectedAccounts from '@/components/autopilot/ConnectedAccounts';
import ActionDraftForm from '@/components/autopilot/ActionDraftForm';
import TaskRunCard from '@/components/autopilot/TaskRunCard';


export default function Autopilot() {
  const [params] = useSearchParams();
  const initialKind = ['social_post', 'marketplace_listing', 'email_send'].includes(params.get('kind')) ? params.get('kind') : 'task';
  const [kind, setKind] = useState(initialKind);

  const [capabilities, setCapabilities] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [mode, setMode] = useState(null);
  const { runs, loading, refresh } = useAutopilotRuns();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    invokeAutopilot({ action: 'capabilities' })
      .then(res => {
        setCapabilities(res.data?.capabilities || []);
        setDestinations(res.data?.destinations || []);
      })
      .catch(() => setCapabilities([]));
    invokeAutopilot({ action: 'get_mode' })
      .then(res => setMode(!!res.data?.enabled))
      .catch(() => setMode(false));
  }, []);

  const activeRun = runs.find(r => r.status === 'running') || runs[0] || null;
  useAutopilotDriver(activeRun?.status === 'running' ? activeRun : null, refresh);

  const toggleMode = async (enabled) => {
    setBusy(true); setError(null);
    try {
      await invokeAutopilot({ action: 'set_mode', enabled });
      setMode(enabled);
      if (!enabled) refresh();
    } catch (e) {
      setError(e?.message || 'Could Not Update The Mode');
    } finally {
      setBusy(false);
    }
  };

  const doAction = useCallback(async (action, runId) => {
    setBusy(true); setError(null);
    try {
      const res = await invokeAutopilot({ action, run_id: runId });
      if (res.data?.error) setError(res.data.error + (res.data.needs_connection ? ' — No Connected Destination.' : ''));
      refresh();
    } catch (e) {
      setError(e?.message || 'Action Failed');
      refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const doAnswer = useCallback(async (runId, answer) => {
    setBusy(true); setError(null);
    try {
      await invokeAutopilot({ action: 'answer', run_id: runId, answer });
      refresh();
    } catch (e) {
      setError(e?.message || 'Could Not Submit The Answer');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Autopilot</h1>
          <p className="text-sm text-muted-foreground mt-1">Typed, Server-Side Task Orchestration — Draft, Preview, Approve, Execute, Verify.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Persistent Mode</div>
          <Switch checked={mode === true} disabled={busy || mode === null} onCheckedChange={toggleMode} />
          <div className="text-[11px] text-muted-foreground mt-1 max-w-[160px]">
            {mode ? 'On — Open Runs Continue Server-Side.' : 'Off — Runs Advance Only While This Screen Is Open.'}
          </div>
        </div>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {capabilities && <CapabilityMatrix capabilities={capabilities} destinations={destinations} />}

      <ConnectedAccounts />

      <Tabs value={kind} onValueChange={setKind}>
        <TabsList>
          <TabsTrigger value="task">General Task</TabsTrigger>
          <TabsTrigger value="email_send">Email</TabsTrigger>
          <TabsTrigger value="social_post">Social Post</TabsTrigger>
          <TabsTrigger value="marketplace_listing">Marketplace Listing</TabsTrigger>
        </TabsList>

        <TabsContent value="task" className="pt-4">
          <TaskStarter mode={mode} onCreated={refresh} busy={busy} setBusy={setBusy} setError={setError} />
        </TabsContent>
        <TabsContent value={kind} className="pt-4">
          {kind !== 'task' && <ActionDraftForm key={kind} kind={kind} destinations={destinations} onDrafted={refresh} />}
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <div className="text-sm font-medium">Your Tasks</div>
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && runs.length === 0 && <div className="text-sm text-muted-foreground">No Autopilot Tasks Yet.</div>}
        {runs.map(run => (
          <TaskRunCard key={run.id} run={run} onAction={doAction} onAnswer={doAnswer} busy={busy} />
        ))}
      </div>
    </div>
  );
}

function TaskStarter({ mode, onCreated, busy, setBusy, setError }) {
  const [goal, setGoal] = useState('');
  const create = async () => {
    setBusy(true); setError(null);
    try {
      const res = await invokeAutopilot({ action: 'create', goal });
      if (res.data?.error) setError(res.data.error);
      else { setGoal(''); onCreated(); }
    } catch (e) {
      setError(e?.message || 'Could Not Start The Task');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm h-24"
        placeholder="Describe The Task — Research, Planning, Analysis, Or A Document"
        value={goal}
        onChange={e => setGoal(e.target.value)}
      />
      <Button disabled={busy || goal.trim().length < 5} onClick={create}>
        {busy ? 'Starting…' : 'Start Task'}
      </Button>
      <p className="text-xs text-muted-foreground">Steps Advance While This Screen Is Open{mode === true ? ' — And Server-Side While Persistent Mode Is On' : ''}.</p>
    </div>
  );
}