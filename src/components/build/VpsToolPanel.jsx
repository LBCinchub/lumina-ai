import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Power, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function VpsToolPanel() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const executeAction = async (action) => {
    setLoading(true);
    setFeedback(null);

    try {
      const result = await base44.functions.invoke('vpsControl', {
        action
      });

      if (result.data?.success) {
        setFeedback({ type: 'success', message: `${action} successful` });
        setStatus(result.data.status);
      } else {
        setFeedback({ type: 'error', message: result.data?.message || 'Action failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to execute action' });
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { id: 'boot', label: 'Boot Server', icon: Power, color: 'bg-green-500' },
    { id: 'reboot', label: 'Reboot', icon: RotateCw, color: 'bg-blue-500' },
    { id: 'shutdown', label: 'Shutdown', icon: Power, color: 'bg-red-500' }
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-6">
      <div>
        <h3 className="font-medium mb-1">VPS Controls</h3>
        <p className="text-sm text-muted-foreground">
          Manage your virtual private server.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => executeAction(action.id)}
              disabled={loading}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border border-border",
                "hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              )}
            >
              <div className={cn('w-8 h-8 rounded flex items-center justify-center text-white', action.color)}>
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className={cn(
          "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
          feedback.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
        )}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {status && (
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Server Status</p>
          <p className="text-sm font-medium text-foreground capitalize">{status}</p>
        </div>
      )}
    </div>
  );
}