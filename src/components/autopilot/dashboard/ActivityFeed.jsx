import React from 'react';
import { formatDistanceToNow } from 'date-fns';

// Flattens each run's redacted audit trail into one recent-activity timeline.
export default function ActivityFeed({ runs }) {
  const events = runs
    .flatMap(r => (r.audit || []).map((a, i) => ({ ...a, key: `${r.id}-${i}`, goal: r.goal })))
    .filter(e => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 25);

  if (!events.length) {
    return <p className="text-sm text-muted-foreground rounded-xl border bg-card p-6 text-center">No activity yet.</p>;
  }
  return (
    <ol className="rounded-xl border bg-card p-4 space-y-4">
      {events.map(e => (
        <li key={e.key} className="flex gap-3">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm"><span className="font-medium capitalize">{String(e.event).replace(/_/g, ' ')}</span>{e.detail ? ` · ${e.detail}` : ''}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{e.goal} · {formatDistanceToNow(new Date(e.at), { addSuffix: true })}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}