import React from 'react';

export const STATUS_META = {
  queued: { label: 'Queued', cls: 'bg-muted text-muted-foreground' },
  running: { label: 'Running', cls: 'bg-primary/15 text-primary' },
  awaiting_input: { label: 'Needs Answer', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  awaiting_approval: { label: 'Needs Approval', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  paused: { label: 'Paused', cls: 'bg-secondary text-secondary-foreground' },
  blocked: { label: 'Blocked', cls: 'bg-destructive/15 text-destructive' },
  completed: { label: 'Completed', cls: 'bg-green-500/15 text-green-700 dark:text-green-400' },
  failed: { label: 'Failed', cls: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
};

export function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.queued;
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${m.cls}`}>{m.label}</span>;
}