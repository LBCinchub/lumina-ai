import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import TwinSettingsModal from '@/components/twin/TwinSettingsModal';

export default function TwinPanel() {
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStyle, setSavingStyle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('lbcTwinEngine', { action: 'get_profile' });
      const data = res?.data || res || {};
      setProfile(data.profile || null);
      setSettings(data.settings || null);
    } catch (_) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStyle = async (style) => {
    if (!profile || profile.communication_style === style || savingStyle) return;
    setSavingStyle(true);
    setProfile({ ...profile, communication_style: style });
    try {
      await base44.functions.invoke('lbcTwinEngine', { action: 'update_settings', communication_style: style });
    } catch (_) { /* fire and forget */ }
    setSavingStyle(false);
  };

  const isLearning = !profile || (profile.interaction_count || 0) < 5;
  const confidence = profile?.confidence_score || 0;
  const traits = Array.isArray(profile?.learned_traits) ? profile.learned_traits : [];

  return (
    <div className="px-3 py-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-foreground/60" />
          <span className="text-[11px] uppercase tracking-[0.14em] text-foreground/70">My Twin</span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1 text-muted-foreground hover:text-foreground"
          title="Twin authorization settings"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="text-[11px] text-muted-foreground">Loading…</div>
      ) : isLearning ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Your Twin is still learning your preferences. Keep using LBC AI to help it improve.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium text-foreground/80">{confidence}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
            <div className="h-full bg-foreground/70 rounded-full transition-all" style={{ width: `${confidence}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mb-3">{profile.interaction_count || 0} interactions</div>

          {traits.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {traits.slice(0, 4).map((t, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-foreground/70 truncate pr-2">{t.trait}</span>
                    <span className="text-muted-foreground">{t.confidence}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-foreground/50 rounded-full" style={{ width: `${t.confidence}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Communication style</div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {['terse', 'balanced', 'chatty'].map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={cn(
                    'flex-1 px-1.5 py-1 text-[11px] capitalize transition-colors',
                    profile.communication_style === s ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <TwinSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSaved={load} />
    </div>
  );
}