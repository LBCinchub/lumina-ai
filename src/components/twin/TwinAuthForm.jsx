import React, { useEffect, useState } from 'react';
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
const fromSettings = (s) => ({
  ride_booking: s?.ride_booking || 'confirm',
  marketplace_listing: s?.marketplace_listing || 'confirm',
  travel_booking: s?.travel_booking || 'confirm',
  max_auto_spend_usd: s?.max_auto_spend_usd || 0
});

// Per-vertical authorization modes and the auto-spend limit of the user's twin.
export default function TwinAuthForm({ settings, onSaved, onCancel }) {
  const [vals, setVals] = useState(() => fromSettings(settings));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'saved' | 'error'
  useEffect(() => { setVals(fromSettings(settings)); }, [settings]);
  const change = (patch) => { setVals(v => ({ ...v, ...patch })); setStatus(null); };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await base44.functions.invoke('lbcTwinEngine', { action: 'update_settings', ...vals });
      setStatus('saved');
      onSaved?.();
    } catch (_) {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {VERTICALS.map(v => (
        <div key={v.key}>
          <div className="text-sm font-medium mb-1.5">{v.label}</div>
          <div className="flex rounded-md border border-border overflow-hidden">
            {MODES.map(m => (
              <button
                key={m}
                type="button"
                aria-pressed={vals[v.key] === m}
                onClick={() => change({ [v.key]: m })}
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
        <label htmlFor="twin-max-spend" className="block text-sm font-medium mb-1.5">Max Auto Spend (USD)</label>
        <input
          id="twin-max-spend"
          type="number"
          min="0"
          value={vals.max_auto_spend_usd}
          onChange={e => change({ max_auto_spend_usd: Math.max(0, Number(e.target.value) || 0) })}
          className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm"
        />
      </div>

      {status === 'error' && <p role="alert" className="text-xs text-destructive">Could Not Save Your Settings. Please Try Again.</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save'}</Button>
      </div>
    </div>
  );
}