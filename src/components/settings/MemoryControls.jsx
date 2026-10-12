import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

const SCOPES = [
  ['financial', 'Money & Finances'],
  ['health', 'Health'],
  ['legal', 'Legal Matters'],
  ['personal_hardship', 'Personal Hardship'],
];

function Row({ label, hint, checked, disabled, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span>
        <span className="text-[13px] font-medium block">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}

// Separate consent switches: memory, past-chat access, sensitive opt-in.
export default function MemoryControls({ settings, saving, onUpdate }) {
  if (!settings) return null;
  const toggleScope = (id, on) => {
    const set = new Set(settings.sensitive_scopes);
    if (on) set.add(id); else set.delete(id);
    onUpdate({ sensitive_scopes: [...set] });
  };
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <Row label="Memory" hint="Remember What You Clearly Share Across Chats." checked={settings.memory_enabled} disabled={saving} onChange={v => onUpdate({ memory_enabled: v })} />
      <Row label="Your Conversation History" hint="Let LBC AI Search Your Own Past Chats When You Ask." checked={settings.history_access_enabled} disabled={saving} onChange={v => onUpdate({ history_access_enabled: v })} />
      <Row label="Sensitive Memory" hint="Off By Default. You Can Still Discuss These Topics Without Them Being Saved." checked={settings.sensitive_memory_enabled} disabled={saving} onChange={v => onUpdate({ sensitive_memory_enabled: v })} />
      {settings.sensitive_memory_enabled && (
        <div className="grid grid-cols-2 gap-2 pl-1">
          {SCOPES.map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-[12px]">
              <Checkbox checked={settings.sensitive_scopes.includes(id)} disabled={saving} onCheckedChange={v => toggleScope(id, !!v)} />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}