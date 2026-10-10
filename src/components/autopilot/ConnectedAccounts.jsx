import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { invokeAutopilot } from '@/hooks/useAutopilot';
import { Mail, Unplug } from 'lucide-react';

const GMAIL_CONNECTOR_ID = '6ac993a978a06fb7c23b4351';

const STATUS_LABEL = {
  ready: 'Connected',
  needs_connection: 'Not Connected',
  needs_setup: 'Owner Setup Required',
  blocked: 'Blocked',
  needs_permission: 'Plan Or Scope Required',
};
const STATUS_COLOR = {
  ready: 'default', needs_connection: 'outline', needs_setup: 'outline',
  blocked: 'secondary', needs_permission: 'outline',
};

// Connected Accounts — the truthful per-provider state of Autopilot
// destinations. Gmail is the only live connection today; every other
// destination shows its exact owner-setup or security blocker.
export default function ConnectedAccounts() {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await invokeAutopilot({ action: 'accounts' });
      setAccounts(res.data?.accounts || []);
    } catch (_) {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // connectAppUser resolves to the provider URL string (SDK >= 0.8.53).
  const connectGmail = async () => {
    setError(''); setConnecting(true);
    let url = '';
    try {
      url = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
    } catch (_) {
      setConnecting(false);
      setError('Could Not Start The Gmail Connection — Please Try Again.');
      return;
    }
    if (typeof url !== 'string' || !/^https:\/\//i.test(url)) {
      setConnecting(false);
      setError('The Connection Link Was Not Valid — Please Try Again.');
      return;
    }
    const popup = window.open(url, '_blank');
    if (!popup) {
      setConnecting(false);
      setError('Your Browser Blocked The Pop-Up — Allow Pop-Ups For This Site And Try Again.');
      return;
    }
    let ticks = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      ticks++;
      if (popup.closed || ticks > 480) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setConnecting(false);
        load();
      }
    }, 500);
  };

  const disconnectGmail = async () => {
    setError('');
    try {
      await base44.connectors.disconnectAppUser(GMAIL_CONNECTOR_ID);
      load();
    } catch (_) {
      setError('Could Not Disconnect Gmail — Please Try Again.');
    }
  };

  const gmail = (accounts || []).find(a => a.provider === 'gmail');
  const others = (accounts || []).filter(a => a.provider !== 'gmail');

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="text-sm font-medium">Connected Accounts</div>
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      {!accounts && <div className="text-sm text-muted-foreground">Checking Your Connections…</div>}

      {gmail && (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" /> {gmail.label}
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={STATUS_COLOR[gmail.status] || 'outline'}>
                {connecting ? 'Connecting…' : (STATUS_LABEL[gmail.status] || gmail.status)}
              </Badge>
              {gmail.status === 'ready' && (
                <Button variant="ghost" size="sm" onClick={disconnectGmail}>
                  <Unplug className="h-3.5 w-3.5" /> Disconnect
                </Button>
              )}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{gmail.reason}</div>
          {gmail.status === 'needs_connection' && (
            <Button size="sm" disabled={connecting} onClick={connectGmail}>
              <Mail className="h-3.5 w-3.5" /> Connect Your Gmail
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {others.map(a => (
          <div key={a.provider} className="flex items-start justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm">{a.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.reason}</div>
            </div>
            <Badge variant={STATUS_COLOR[a.status] || 'outline'} className="shrink-0">
              {STATUS_LABEL[a.status] || a.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}