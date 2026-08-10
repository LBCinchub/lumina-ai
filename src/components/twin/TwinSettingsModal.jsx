import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const VERTICALS = [
  { key: 'ride_booking', label: 'Ride Booking' },
  { key: 'marketplace_listing', label: 'Marketplace Listing' },
  { key: 'travel_booking', label: 'Travel Booking' }
];
const MODES = ['auto', 'confirm', 'off'];

const MODE_HINT = {
  auto: 'Auto = twin acts immediately within spend limit.',
  confirm: 'Confirm = twin asks first.',
  off: 'Off = disabled.'
};

export default function TwinSettingsModal({ open, onOpenChange, settings, onSaved }) {
  const [vals, setVals] = useState({
    ride_booking: 'confirm',
    marketplace_listing: 'confirm',
    travel_booking: 'confirm',
    max_auto_spend_usd: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setVals({
        ride_booking: settings.ride_booking || 'confirm',
        marketplace_listing: settings.marketplace_listing || 'confirm',
        travel_booking: settings.travel_booking || 'confirm',
        max_auto_spend_usd: settings.max_auto_spend_usd || 0
      });
    }
  }, [settings, open]);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('lbcTwinEngine', { action: 'update_settings', ...vals });
      onSaved?.();
      onOpenChange(false);
    } catch (_) { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Twin Authorization</DialogTitle>
          <DialogDescription>
            Control what your Twin can do on your behalf. Financial actions always require explicit confirmation regardless of these settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {VERTICALS.map(v => (
            <div key={v.key}>
              <div className="text-sm font-medium mb-1.5">{v.label}</div>
              <div className="flex rounded-md border border-border overflow-hidden">
                {MODES.map(m => (
                  <button
                    key={m}
                    onClick={() => setVals(s => ({ ...s, [v.key]: m }))}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-xs capitalize transition-colors',
                      vals[v.key] === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{MODE_HINT[vals[v.key]]}</p>
            </div>
          ))}

          <div>
            <div className="text-sm font-medium mb-1.5">Max Auto Spend (USD)</div>
            <input
              type="number"
              min="0"
              value={vals.max_auto_spend_usd}
              onChange={e => setVals(s => ({ ...s, max_auto_spend_usd: Number(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}