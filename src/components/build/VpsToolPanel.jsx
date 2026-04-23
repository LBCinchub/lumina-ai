import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertCircle, CheckCircle2, Power, RotateCw, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'boot', label: 'Boot', icon: Power, color: 'text-green-600' },
  { id: 'reboot', label: 'Reboot', icon: RotateCw, color: 'text-blue-600' },
  { id: 'shutdown', label: 'Shutdown', icon: Square, color: 'text-red-600' },
];

export default function VpsToolPanel() {
  const [status, setStatus] = useState('unknown');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('vpsControl', { action: 'status' });
      setStatus(res.data?.status || 'unknown');
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (actionId) => {
    setExecuting(actionId);
    try {
      const res = await base44.functions.invoke('vpsControl', { action: actionId });
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          action: actionId,
          result: res.data?.message || 'Success',
          success: res.data?.success !== false
        }
      ]);
      await checkStatus();
    } catch (error) {
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: actionId,
        result: error.message || 'Failed',
        success: false
      }]);
    } finally {
      setExecuting(null);
    }
  };

  const statusColors = {
    online: 'bg-green-500/15 text-green-700',
    offline: 'bg-red-500/15 text-red-700',
    unknown: 'bg-slate-500/15 text-slate-700',
    error: 'bg-destructive/15 text-destructive'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-minimal p-5 space-y-6">
        {/* Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Server Status</h3>
          <div className={cn(
            "rounded-lg px-4 py-3 text-sm capitalize font-medium",
            statusColors[status] || statusColors.unknown
          )}>
            {status}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => executeAction(action.id)}
                  disabled={executing !== null}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  {executing === action.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className={cn("w-4 h-4", action.color)} />
                  )}
                  <span className="text-xs">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Activity Log */}
        {logs.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Activity Log</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-minimal">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50">
                  {log.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground/70">{log.action}</p>
                    <p className="text-foreground/60">{log.result}</p>
                    <p className="text-foreground/40 text-[11px] mt-1">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}