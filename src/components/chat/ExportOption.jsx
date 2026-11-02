import React from 'react';
import { Loader2, Check } from 'lucide-react';

// One row in the Export dialog: idle (its own icon), working (spinner) or done (check).
export default function ExportOption({ icon: Icon, title, hint, state = 'idle', onClick, disabled }) {
  const StateIcon = state === 'working' ? Loader2 : state === 'done' ? Check : Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-left disabled:opacity-50"
    >
      <StateIcon
        className={`w-4 h-4 shrink-0 ${state === 'done' ? 'text-primary' : 'text-muted-foreground'} ${state === 'working' ? 'animate-spin' : ''}`}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground break-all">{hint}</div>
      </div>
    </button>
  );
}