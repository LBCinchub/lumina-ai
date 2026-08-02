import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Honest "disabled" state for the legacy VPS deployer controls. The legacy
// deploy path is disabled pending the governed plan-confirm-execute
// workflow — no button here can fire an external push.
export default function DeployUnavailable({ className }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-amber-500/20 bg-amber-500/5",
      className
    )}>
      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
        <Lock className="w-5 h-5 text-amber-500" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">
        Unavailable — governed deployment workflow pending
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
        Legacy VPS deploy path is disabled pending the governed plan-confirm-execute workflow. No external push is performed.
      </p>
    </div>
  );
}