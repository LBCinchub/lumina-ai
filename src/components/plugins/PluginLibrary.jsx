import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import PluginRow from '@/components/plugins/PluginRow';
import PluginDetail from '@/components/plugins/PluginDetail';

const call = async (body) => (await base44.functions.invoke('plugins', body)).data;
const RESULT = { installed: 'Installed.', reapproved: 'Re-Approved.', already_installed: 'Already Installed.', enabled: 'Enabled.', disabled: 'Disabled.', uninstalled: 'Removed. Your Data And Connections Were Kept.' };

export default function PluginLibrary({ open, onOpenChange }) {
  const [plugins, setPlugins] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('available');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [consent, setConsent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { const d = await call({ action: 'list' }); setPlugins(d.plugins); return d.plugins; }
    catch (_) { setError('Plugins Could Not Be Loaded. Please Try Again.'); return null; }
  }, []);
  useEffect(() => { if (open) load(); else { setSel(null); setMessage(''); } }, [open, load]);

  const openPlugin = async (p) => {
    setSel(p); setMessage(''); setConsent(null);
    if (p.status === 'available') { const d = await call({ action: 'preview', plugin_id: p.id }); if (d.ok) setConsent(d.consent); }
  };
  const act = async (body) => {
    setBusy(true);
    const r = await call(body).catch(() => ({ ok: false }));
    setMessage(RESULT[r.code] || `Not Changed (${r.code || 'error'}).`);
    const list = await load();
    setSel(list?.find(x => x.id === sel.id) || null);
    setBusy(false);
  };

  const shown = (plugins || []).filter(p => (tab === 'installed' ? p.installed : true) && `${p.title} ${p.description}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Plugins</SheetTitle><SheetDescription>Reviewed LBC Tools And Skills For Chat.</SheetDescription></SheetHeader>
        <div className="mt-4">
          {sel ? (
            <PluginDetail plugin={sel} consent={consent} busy={busy} message={message} onBack={() => setSel(null)}
              onInstall={() => act({ action: 'install', ...consent })}
              onToggle={() => act({ action: 'set_enabled', plugin_id: sel.id, enabled: !sel.enabled })}
              onRemove={() => act({ action: 'uninstall', plugin_id: sel.id })} />
          ) : (
            <div className="space-y-3">
              <Tabs value={tab} onValueChange={setTab}><TabsList className="w-full"><TabsTrigger value="available" className="flex-1">Available</TabsTrigger><TabsTrigger value="installed" className="flex-1">Installed</TabsTrigger></TabsList></Tabs>
              <Input aria-label="Search Plugins" placeholder="Search Plugins" value={q} onChange={e => setQ(e.target.value)} />
              {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
              {!plugins && !error && <p className="text-xs text-muted-foreground">Loading…</p>}
              {plugins && !shown.length && <p className="text-xs text-muted-foreground">{tab === 'installed' ? 'No Plugins Installed Yet.' : 'No Matching Plugins.'}</p>}
              <ul className="space-y-2">{shown.map(p => <li key={p.id}><PluginRow plugin={p} onOpen={openPlugin} /></li>)}</ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}