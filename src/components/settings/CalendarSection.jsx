import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CalendarDays, Loader2 } from 'lucide-react';

const CONNECTOR_ID = '6ad9bd18fe76c4faf9c0122a';

export default function CalendarSection() {
  const [state, setState] = useState('loading');
  const [count, setCount] = useState(0);

  const load = async () => {
    setState('loading');
    const res = await base44.functions.invoke('calendarStatus', {}).catch(() => null);
    setState(res?.data?.state || 'error');
    setCount(res?.data?.count || 0);
  };
  useEffect(() => { load(); }, []);

  const connect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const t = setInterval(() => { if (!popup || popup.closed) { clearInterval(t); load(); } }, 500);
  };
  const disconnect = async () => { await base44.connectors.disconnectAppUser(CONNECTOR_ID); load(); };

  const text = {
    loading: 'Checking…',
    ok: `Connected. ${count} Meeting${count === 1 ? '' : 's'} In The Last 7 Days And Next 2 Days. Ask Chat About Your Meetings Or Action Items.`,
    not_connected: 'Not Connected. Connect To Let Chat Read Your Meeting Notes (Read-Only).',
    error: 'Could Not Verify Right Now. Try Again Shortly.',
  }[state];

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-3">
      <CalendarDays className="w-5 h-5 text-primary mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">Google Calendar</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{text}</p>
      </div>
      {state === 'loading' ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        : state === 'ok' ? <Button size="sm" variant="outline" onClick={disconnect}>Disconnect</Button>
        : <Button size="sm" onClick={connect}>Connect</Button>}
    </div>
  );
}