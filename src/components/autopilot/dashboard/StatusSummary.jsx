import React from 'react';
import { STATUS_META } from './statusMeta';

const ORDER = ['running', 'queued', 'awaiting_input', 'awaiting_approval', 'paused', 'blocked', 'completed', 'failed'];

export default function StatusSummary({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ORDER.map(s => (
        <div key={s} className="rounded-xl border bg-card p-4">
          <div className="text-2xl font-serif font-medium">{counts[s] || 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{STATUS_META[s].label}</div>
        </div>
      ))}
    </div>
  );
}