import React, { useState } from 'react';
import { Sparkles, Settings as SettingsIcon } from 'lucide-react';
import TwinSettingsModal from '@/components/twin/TwinSettingsModal';
import TwinProfileDetails from '@/components/twin/TwinProfileDetails';
import { useTwinProfile } from '@/hooks/useTwinProfile';

export default function TwinPanel() {
  const { profile, settings, loading, error, reload, setStyle } = useTwinProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="px-3 py-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-foreground/70">My Twin</span>
        </div>
        {/* Disabled until loaded, so unloaded defaults are never saved over real settings. */}
        <button
          onClick={() => setSettingsOpen(true)}
          disabled={loading || !!error}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
          title="Twin authorization settings"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="text-[11px] text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-[11px] text-destructive">{error}</div>
      ) : (
        <TwinProfileDetails profile={profile} onStyle={setStyle} />
      )}

      <TwinSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSaved={reload} />
    </div>
  );
}