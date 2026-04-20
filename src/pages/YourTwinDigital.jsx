import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

export default function YourTwinDigital() {
  const [profile, setProfile] = useState(null);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const contexts = await base44.entities.UserContext.list();
      const ctx = contexts[0] || null;
      setProfile(user);
      setContext(ctx);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your digital twin…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Living memory
            </div>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">Your Twin Digital</h1>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            size="sm"
            variant="outline"
            className="rounded-full"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl mb-12">
          A consolidated view of who you are. Essential data. Nothing redundant. This is your digital mirror—what Lumina knows and remembers about you.
        </p>

        {/* Core Profile */}
        <div className="border border-border rounded-xl p-8 mb-8 bg-card/50">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Profile</div>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <div className="text-base font-medium">{profile?.full_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <div className="text-base font-medium">{profile?.email || '—'}</div>
            </div>
            {profile?.role && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Role</div>
                <div className="text-base font-medium capitalize">{profile.role}</div>
              </div>
            )}
          </div>
        </div>

        {/* Context & Memory */}
        {context ? (
          <div className="space-y-6">
            {context.identity && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Identity</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.identity}</p>
              </div>
            )}

            {context.vision && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Vision</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.vision}</p>
              </div>
            )}

            {context.current_focus && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Current Focus</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.current_focus}</p>
              </div>
            )}

            {context.values && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Values</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.values}</p>
              </div>
            )}

            {context.communication_style && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">How to Speak With You</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.communication_style}</p>
              </div>
            )}

            {context.context_notes && (
              <div className="border border-border rounded-xl p-8 bg-card/50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">Additional Context</div>
                <p className="text-[15px] leading-relaxed text-foreground/90 prose-lumina">{context.context_notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-border rounded-xl p-12 bg-card/50 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No context defined yet. Visit /context to build your digital twin.
            </p>
            <a
              href="/context"
              className="text-xs uppercase tracking-[0.14em] text-foreground/70 hover:text-foreground border-b border-foreground/30 hover:border-foreground pb-0.5"
            >
              Set up context
            </a>
          </div>
        )}
      </div>
    </div>
  );
}