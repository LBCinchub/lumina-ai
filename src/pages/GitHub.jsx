import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Github, Loader2 } from 'lucide-react';

const CONNECTOR_ID = '69e9a63841ece86c3a6ac789';

// Public-safe GitHub connection screen: the signed-in user's own connection only.
export default function GitHub() {
  const [state, setState] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const check = useCallback(async () => {
    const res = await base44.functions.invoke('githubConnectionStatus', {}).catch(() => null);
    setState(res?.data ? { ...res.data, loading: false } : { loading: false, failed: true });
  }, []);
  useEffect(() => { check(); }, [check]);

  const connect = async () => {
    setBusy(true); setError(null);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      if (!url) throw new Error('GitHub Sign-In Is Not Configured For This App Yet (No Authorization URL Was Returned).');
      const popup = window.open(url, '_blank', 'width=500,height=600');
      if (!popup) throw new Error('Pop-Up Blocked. Allow Pop-Ups And Try Again.');
      const t = setInterval(() => { if (popup.closed) { clearInterval(t); setBusy(false); check(); } }, 500);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true);
    await base44.connectors.disconnectAppUser(CONNECTOR_ID).catch(() => null);
    setBusy(false); check();
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <div className="flex items-center gap-3"><Github className="w-6 h-6" /><h1 className="font-serif text-2xl font-medium">GitHub Connection</h1></div>
      <p className="text-sm text-muted-foreground">Connect Your Own GitHub Account. Nothing Is Pushed From This Screen.</p>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : state.failed ? (
          <p className="text-sm text-destructive">Could Not Check Your GitHub Connection.</p>
        ) : (
          <p className="text-sm">{state.connected
            ? `Connected${state.login ? ` As ${state.login}` : ''}${state.verified ? '' : ' (GitHub Did Not Confirm The Account)'}.`
            : 'Not Connected.'}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!state.loading && (state.connected
          ? <Button variant="outline" onClick={disconnect} disabled={busy}>Disconnect</Button>
          : <Button onClick={connect} disabled={busy}>{busy ? 'Connecting…' : 'Connect GitHub'}</Button>)}
      </div>
      <div className="flex gap-4 text-sm">
        <Link to="/build" className="text-primary underline">Open Build</Link>
        <Link to="/settings" className="text-primary underline">Open Settings</Link>
      </div>
    </div>
  );
}