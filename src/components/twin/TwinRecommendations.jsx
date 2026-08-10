import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function TwinRecommendations({ onAct }) {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('lbcTwinEngine', { action: 'recommend' });
        const data = res?.data || res || {};
        setRecs(Array.isArray(data.recommendations) ? data.recommendations : []);
      } catch (_) {
        setRecs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || recs.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Twin suggestions</div>
      {recs.map(r => (
        <div key={r.id} className="rounded-lg border border-border/70 bg-card/60 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-snug text-foreground/85">{r.text}</p>
            <span
              className={cn(
                'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded',
                r.exploratory ? 'bg-muted text-muted-foreground' : 'bg-foreground/10 text-foreground/70'
              )}
            >
              {r.confidence}%
            </span>
          </div>
          {r.confidence >= 40 && (
            <button
              onClick={() => onAct?.(r)}
              className="mt-2 text-[11px] underline text-foreground/70 hover:text-foreground"
            >
              Act on this
            </button>
          )}
        </div>
      ))}
    </div>
  );
}