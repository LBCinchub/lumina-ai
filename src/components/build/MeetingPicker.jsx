import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function MeetingPicker({ onAttach }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    base44.functions.invoke('projectMeetings', { action: 'list' }).then(r => setData(r.data));
  }, []);

  const run = async (id, tasks) => {
    setBusy(id + tasks);
    await onAttach(id, tasks).finally(() => setBusy(null));
  };

  if (!data) return <div className="py-2"><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /></div>;
  if (data.status === 'not_connected') return <p className="text-[11px] text-muted-foreground mb-2">Google Calendar is not connected. <Link to="/settings" className="underline">Connect it in Settings</Link>.</p>;
  if (data.status === 'error') return <p className="text-[11px] text-destructive mb-2">Your calendar could not be read right now. Try again shortly.</p>;
  if (!data.events.length) return <p className="text-[11px] text-muted-foreground mb-2">No meetings in the last 14 days or next 7.</p>;

  return (
    <div className="mb-3 rounded-lg border border-border bg-card p-2 space-y-2">
      {data.events.map(e => (
        <div key={e.id} className="text-[11px]">
          <p className="truncate font-medium">{e.title}</p>
          <p className="text-[10px] text-muted-foreground">{e.start ? new Date(e.start).toLocaleString() : ''}</p>
          <div className="flex gap-2 mt-1">
            <button disabled={!!busy} onClick={() => run(e.id, false)} className="text-primary hover:underline disabled:opacity-50">
              {busy === e.id + false ? 'Adding…' : 'Add To History'}
            </button>
            <button disabled={!!busy || !e.notes} onClick={() => run(e.id, true)} className="text-primary hover:underline disabled:opacity-40" title={e.notes ? '' : 'No notes on this event'}>
              {busy === e.id + true ? 'Creating…' : 'Add + Action Items'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}