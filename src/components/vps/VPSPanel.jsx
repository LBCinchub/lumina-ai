import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Server, RefreshCw, Power, RotateCcw, Square, Loader2, CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { id: 'info', label: 'Refresh Info', icon: RefreshCw, variant: 'outline', safe: true },
  { id: 'reboot', label: 'Reboot', icon: RotateCcw, variant: 'outline', confirm: true },
  { id: 'boot', label: 'Boot', icon: Power, variant: 'outline', confirm: true },
  { id: 'shutdown', label: 'Shutdown', icon: Square, variant: 'destructive', confirm: true },
];

export default function VPSPanel() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [info, setInfo] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  const callVPS = async (action) => {
    setActionLoading(action);
    setError(null);
    try {
      const res = await base44.functions.invoke('vpsControl', { action });
      const entry = { action, time: new Date().toLocaleTimeString(), result: res.data };
      setLog(prev => [entry, ...prev].slice(0, 10));
      if (action === 'info' || action === 'status') {
        setInfo(res.data?.result);
      }
      return res.data;
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => { callVPS('info'); }, []);

  const handleAction = async (action, confirm) => {
    if (confirm && !window.confirm(`Are you sure you want to ${action} the VPS?`)) return;
    await callVPS(action);
  };

  return (
    <div className="space-y-5">
      {/* Server info card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-sm">server1.lbc.network</span>
            <span className="text-xs text-muted-foreground">203.161.49.75</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Online</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'OS', value: 'Ubuntu 24.04' },
            { label: 'Memory', value: '2 GB' },
            { label: 'Disk', value: '40 GB' },
            { label: 'Bandwidth', value: '1000 GB' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/40 rounded-lg px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
              <div className="font-medium text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {info && Object.keys(info).length > 0 && (
          <div className="mt-3 bg-muted/40 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Live Status</div>
            <pre className="text-xs text-foreground/80 whitespace-pre-wrap overflow-auto max-h-32">
              {JSON.stringify(info, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Controls</div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map(({ id, label, icon: Icon, variant, confirm, safe }) => (
            <Button
              key={id}
              variant={variant}
              size="sm"
              disabled={!!actionLoading}
              onClick={() => handleAction(id, confirm)}
              className="gap-2"
            >
              {actionLoading === id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Icon className="w-3.5 h-3.5" />}
              {label}
            </Button>
          ))}
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Action log */}
      {log.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Activity className="w-3 h-3" /> Action Log
          </div>
          <div className="space-y-2">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="text-muted-foreground shrink-0">{entry.time}</span>
                <span className="font-mono font-medium text-foreground/80 shrink-0">{entry.action}</span>
                <span className="text-muted-foreground truncate">
                  {entry.result?.success ? '✓ OK' : entry.result?.error || 'done'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}