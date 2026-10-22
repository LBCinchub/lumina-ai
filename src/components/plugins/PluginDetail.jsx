import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATE_LABEL, PLAN_LABEL } from '@/components/plugins/pluginLabels';

export default function PluginDetail({ plugin, consent, busy, message, onBack, onInstall, onToggle, onRemove }) {
  const canInstall = consent && ['not_installed', 'needs_reapproval'].includes(plugin.state);
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
      <div>
        <h3 className="font-serif text-lg">{plugin.title} <span className="text-xs text-muted-foreground">v{plugin.version} · LBC</span></h3>
        <p className="text-sm text-muted-foreground mt-1">{plugin.description}</p>
        <p className="text-xs mt-2">Status: <strong>{STATE_LABEL[plugin.state]}</strong></p>
        {plugin.reason && <p className="text-xs text-muted-foreground mt-1">{plugin.reason}</p>}
      </div>
      {plugin.status === 'available' && (
        <section aria-label="Permission Summary" className="rounded-lg bg-muted p-3 text-xs space-y-1.5">
          <div><strong>Capabilities:</strong> {plugin.capabilities.join(', ')}</div>
          <div><strong>Permissions:</strong><ul className="list-disc ml-4">{plugin.permissions.map(p => <li key={p}>{p}</li>)}</ul></div>
          <div><strong>Plan:</strong> {PLAN_LABEL[plugin.min_plan]} · <strong>Connection:</strong> {plugin.connection || 'None'}</div>
          <div className="text-muted-foreground">Installing Never Connects Accounts Or Grants New Scopes. Disabling Only Turns Off This Plugin; Connections And Core Chat Features Stay As They Are.</div>
        </section>
      )}
      {message && <p role="status" className="text-xs">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {canInstall && <Button onClick={onInstall} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{plugin.state === 'needs_reapproval' ? 'Re-Approve' : 'Install'} v{consent.version}</Button>}
        {plugin.installed && plugin.state !== 'needs_reapproval' && <Button variant="outline" onClick={onToggle} disabled={busy}>{plugin.enabled ? 'Disable' : 'Enable'}</Button>}
        {plugin.installed && <Button variant="ghost" onClick={onRemove} disabled={busy}>Remove</Button>}
      </div>
    </div>
  );
}