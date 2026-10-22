import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { StatusPill } from './statusMeta';

export default function ActiveRuns({ runs }) {
  if (!runs.length) {
    return <p className="text-sm text-muted-foreground rounded-xl border bg-card p-6 text-center">No active tasks right now.</p>;
  }
  return (
    <div className="rounded-xl border bg-card divide-y">
      {runs.map(r => {
        const steps = r.steps || [];
        const done = steps.filter(s => s.status === 'completed').length;
        const current = steps.find(s => s.status === 'running' || s.status === 'pending');
        return (
          <Link key={r.id} to="/autopilot" className="block p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium line-clamp-1">{r.goal}</p>
              <StatusPill status={r.status} />
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground gap-3">
              <span className="line-clamp-1">
                {r.blocked_reason || r.clarifying_question || (current ? `Next: ${current.title}` : `${done}/${steps.length} steps`)}
              </span>
              <span className="whitespace-nowrap">{formatDistanceToNow(new Date(r.updated_date), { addSuffix: true })}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}