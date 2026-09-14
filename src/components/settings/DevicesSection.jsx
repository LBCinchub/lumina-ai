import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, MonitorSmartphone, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// Devices section of Settings — lists this user's enrolled devices and lets
// them revoke one through the server function. Reads are RLS-scoped to this
// account only; the client never writes device records.
export default function DevicesSection() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null); // device row pending revocation
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.DeviceKey.list('-created_date', 50);
      setDevices(data);
    } catch (_) {
      setError('Could Not Load Your Devices — Please Try Again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async () => {
    if (!confirming || revoking) return;
    setRevoking(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('registerOrVerifyDevice', {
        action: 'revoke',
        device_id: confirming.id,
      });
      const data = res?.data || res || {};
      if (data.error) {
        setError(data.error);
      } else {
        setConfirming(null);
        await load();
      }
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.data?.error || err?.error;
      setError(serverError || 'Revocation Failed — Please Try Again.');
    }
    setRevoking(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MonitorSmartphone className="w-4 h-4 text-pink-400" strokeWidth={1.75} />
          <h2 className="text-sm font-medium">Devices</h2>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
        </button>
      </div>

      <div className="divide-y divide-border">
        {error && (
          <div className="px-4 md:px-5 py-3 text-[12px] text-destructive">{error}</div>
        )}
        {loading ? (
          <div className="px-4 md:px-5 py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
          </div>
        ) : devices.length === 0 ? (
          <div className="px-4 md:px-5 py-8 text-center text-[12px] text-muted-foreground">
            No Devices Enrolled Yet — Your Browser Enrolls Automatically When You Sign In.
          </div>
        ) : (
          devices.map(d => (
            <div key={d.id} className="px-4 md:px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium truncate">{d.device_name}</span>
                  {d.status === 'Active' ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                      <XCircle className="w-3 h-3" strokeWidth={2} /> Revoked
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  First Seen {d.first_seen || '—'} · Last Seen {d.last_seen || '—'}
                </div>
              </div>
              {d.status === 'Active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirming(d)}
                  className="text-[12px]"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={!!confirming} onOpenChange={(open) => { if (!open && !revoking) setConfirming(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke This Device?</DialogTitle>
            <DialogDescription>
              A Revoked Device Must Enroll As A New Device On Its Next Visit. You Stay Signed In On This Browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Revoke Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}