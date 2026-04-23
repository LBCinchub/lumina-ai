import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Server, Power, RotateCw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function VpsToolPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        if (me?.vps_server_name) {
          fetchStatus();
        }
      }
      setLoading(false);
    });
  }, []);

  const fetchStatus = async () => {
    try {
      const result = await base44.functions.invoke('vpsControl', {
        action: 'status'
      });
      setStatus(result.data);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to fetch VPS status' });
    }
  };

  const handleAction = async (action) => {
    setExecuting(true);
    setFeedback(null);

    try {
      const result = await base44.functions.invoke('vpsControl', { action });
      setFeedback({ type: 'success', message: `Action "${action}" completed` });
      await fetchStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: `Failed to execute "${action}"` });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user?.vps_server_name) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="text-center">
          <Server className="w-8 h-8 opacity-30 mx-auto mb-2" />
          <p>VPS not connected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-5">
      <div>
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Server Control
        </h3>
        <p className="text-sm text-muted-foreground">
          {user.vps_server_name}
        </p>
      </div>

      {status && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={cn(
              "text-sm font-medium px-2.5 py-1 rounded-full",
              status.is_online ? "bg-green-500/15 text-green-700" : "bg-destructive/15 text-destructive"
            )}>
              {status.is_online ? '● Online' : '● Offline'}
            </span>
          </div>
          {status.load_average && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Load</span>
              <span className="text-sm font-mono">{status.load_average}</span>
            </div>
          )}
          {status.memory_info && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className="text-sm font-mono">{status.memory_info}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</div>
        <Button
          onClick={() => handleAction('reboot')}
          disabled={executing}
          variant="outline"
          className="w-full gap-2 justify-start"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
          Reboot Server
        </Button>
        <Button
          onClick={() => handleAction('shutdown')}
          disabled={executing}
          variant="outline"
          className="w-full gap-2 justify-start text-destructive hover:text-destructive"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
          Shutdown
        </Button>
      </div>

      {feedback && (
        <div className={cn(
          "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
          feedback.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
        )}>
          {feedback.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {feedback.message}
        </div>
      )}
    </div>
  );
}