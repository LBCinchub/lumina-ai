import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const STEP_COLOR = { completed: 'default', running: 'outline', pending: 'secondary', failed: 'outline', skipped: 'secondary' };

function StatusBadge({ status }) {
  const map = {
    queued: 'Queued', running: 'Running', awaiting_input: 'Waiting For Your Answer',
    awaiting_approval: 'Awaiting Approval', blocked: 'Blocked', paused: 'Paused',
    completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
  };
  return <Badge variant={status === 'completed' ? 'default' : 'outline'}>{map[status] || status}</Badge>;
}

// Renders any AutopilotRun: capability-task runs (steps) or action runs
// (draft preview, approval, receipt). Shows real evidence only.
export default function TaskRunCard({ run, onAction, onAnswer, busy }) {
  const draft = run.action_draft;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium">
          {run.kind === 'social_post' ? 'Social Post' : run.kind === 'marketplace_listing' ? 'Marketplace Listing' : run.kind === 'email' ? 'Email' : run.goal}
        </div>
        <StatusBadge status={run.status} />
      </div>

      {run.kind !== 'task' && draft && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">Destination: {draft.destination_label}</div>
          <div className="text-sm whitespace-pre-wrap">{draft.copy}</div>
          {(draft.kind === 'email_send' || draft.kind === 'email_draft') && (
            <div className="text-xs text-muted-foreground">
              To: {draft.fields?.to}{draft.fields?.cc ? ` · Cc: ${draft.fields.cc}` : ''} · Subject: {draft.fields?.subject || '(No Subject)'}
            </div>
          )}
          {draft.kind === 'marketplace_listing' && (
            <div className="text-xs text-muted-foreground">
              Item: {draft.fields?.item} · Condition: {draft.fields?.condition} · Price: {draft.fields?.price ?? ''} {draft.fields?.currency || ''} · Location: {draft.fields?.location}
            </div>
          )}
          <div className="text-xs text-muted-foreground">{(draft.attachments || []).length} Photo(s) Attached · Approval Expires 10 Minutes After Each Draft Or Edit</div>
        </div>
      )}

      {run.kind === 'task' && run.plan_summary && <div className="text-sm text-muted-foreground">{run.plan_summary}</div>}

      {run.blocked_reason && <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">{run.blocked_reason}</div>}

      {run.kind === 'task' && (run.steps || []).length > 0 && (
        <div className="space-y-2">
          {run.steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant={STEP_COLOR[s.status] || 'outline'} className="shrink-0">{s.status}</Badge>
              <div className="min-w-0">
                <div>{s.title}</div>
                {s.status === 'completed' && s.output && <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap line-clamp-3">{s.output.slice(0, 300)}</div>}
                {s.error && <div className="text-xs text-destructive mt-0.5">{s.error}</div>}
                {s.sources?.length > 0 && <div className="text-xs text-muted-foreground mt-0.5">Sources: {s.sources.map(x => x.title || x.url).slice(0, 3).join(' · ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {run.clarifying_question && run.status === 'awaiting_input' && (
        <AnswerBox runId={run.id} question={run.clarifying_question} onAnswer={onAnswer} busy={busy} />
      )}

      {run.receipt?.verified && (
        <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          Receipt: {run.receipt.provider}{run.receipt.external_id ? ` · ${run.receipt.external_id}` : ''}
          {run.receipt.url && <> · <a className="underline" href={run.receipt.url} target="_blank" rel="noreferrer">View Post</a></>}
          {run.receipt.thread_id && <> · Thread {run.receipt.thread_id.slice(0, 12)}</>}
          {run.receipt.mock && ' · Mock — Nothing Was Published'}
        </div>
      )}

      {run.final_summary && run.kind !== 'task' && <div className="text-sm">{run.final_summary}</div>}

      <div className="flex flex-wrap gap-2">
        {run.kind !== 'task' && run.status === 'awaiting_approval' && (
          <Button size="sm" disabled={busy} onClick={() => onAction('approve', run.id)}>
            {draft.kind === 'email_draft' ? 'Approve And Save Draft' : 'Approve And Send'}
          </Button>
        )}
        {run.status === 'running' && <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('pause', run.id)}>Pause</Button>}
        {run.status === 'paused' && <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('resume', run.id)}>Resume</Button>}
        {run.status === 'failed' && <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('retry', run.id)}>Retry</Button>}
        {!['completed', 'cancelled'].includes(run.status) && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('cancel', run.id)}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

function AnswerBox({ runId, question, onAnswer, busy }) {
  const [answer, setAnswer] = useState('');
  return (
    <div className="space-y-2">
      <div className="text-sm">{question}</div>
      <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your Answer" />
      <Button size="sm" disabled={busy || !answer.trim()} onClick={() => onAnswer(runId, answer)}>Submit</Button>
    </div>
  );
}