import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import DisclosureSection from '@/components/autopilot/DisclosureSection';
import PersistentModeToggle from '@/components/autopilot/PersistentModeToggle';
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
  }, []);

  const activeRun = runs.find(r => r.status === 'running') || runs[0] || null;
  useAutopilotDriver(activeRun?.status === 'running' ? activeRun : null, refresh);

  const onModeConfirmed = useCallback((enabled) => {
    setMode(enabled);
    if (enabled === false) refresh();
  }, [refresh]);

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
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <PageHeader
        title="Autopilot"
        description="Typed, Server-Side Task Orchestration: Draft, Preview, Approve, Execute, Verify."
        actions={<Link to="/autopilot/dashboard" className="inline-flex items-center min-h-[44px] px-3 rounded-lg border border-border text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open Dashboard</Link>}
      />

      <PersistentModeToggle onConfirmedChange={onModeConfirmed} />

      {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <section aria-labelledby="new-task" className="rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 id="new-task" className="text-sm font-medium mb-3">New Task</h2>
      <Tabs value={kind} onValueChange={setKind}>
        <TabsList className="flex-wrap h-auto">
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
      </section>

      <section aria-labelledby="your-tasks" className="space-y-3">
        <h2 id="your-tasks" className="text-sm font-medium">Your Tasks</h2>
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && runs.length === 0 && <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground text-center">No Autopilot Tasks Yet.</div>}
        {runs.map(run => (
          <TaskRunCard key={run.id} run={run} onAction={doAction} onAnswer={doAnswer} busy={busy} />
        ))}
      </section>

      <DisclosureSection title="Capabilities" hint="What Autopilot Can Do On Your Plan, As Reported By The Server">
        {capabilities ? <CapabilityMatrix capabilities={capabilities} destinations={destinations} /> : <div className="text-sm text-muted-foreground">Loading…</div>}
      </DisclosureSection>

      <DisclosureSection title="Connections" hint="Accounts Autopilot May Use After Your Approval">
        <ConnectedAccounts />
      </DisclosureSection>
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
        aria-label="Task Description"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm h-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Describe The Task: Research, Planning, Analysis, Or A Document"
        value={goal}
        onChange={e => setGoal(e.target.value)}
      />
      <Button disabled={busy || goal.trim().length < 5} onClick={create}>
        {busy ? 'Starting…' : 'Start Task'}
      </Button>
      <p className="text-xs text-muted-foreground">Steps Advance While This Screen Is Open{mode === true ? ' — Persistent Mode Is Saved On, But Background Setup Is Required Before Runs Continue Server-Side' : ''}.</p>
    </div>
  );
}