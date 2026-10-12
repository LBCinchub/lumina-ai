import React from 'react';
import { History } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useMemorySettings } from '@/hooks/useMemorySettings';

// Real "Your Conversation History" consent control. When off, LBC AI never
// searches past chats; it offers to enable this or to select a thread.
export default function ContextToggle() {
  const { settings, saving, error, update } = useMemorySettings();
  const on = !!settings?.history_access_enabled;
  return (
    <div className="border-t border-border/60 pt-4 px-4">
      <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">Context</span>
      <label className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2">
          <History className="w-3.5 h-3.5" /> Your Conversation History
        </span>
        <Switch
          checked={on}
          disabled={!settings || saving}
          onCheckedChange={(v) => update({ history_access_enabled: v })}
          aria-label="Allow LBC AI To Search Your Past Conversations"
        />
      </label>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {settings ? (on ? 'LBC AI Can Look Up Your Own Past Chats When You Ask.' : 'Off — Past Chats Are Never Searched.') : 'Loading…'}
      </p>
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}