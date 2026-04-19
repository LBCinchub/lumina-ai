import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateInsights', {});
      const data = res?.data || res;
      setInsights(data?.insights || []);
      setGenerated(true);
    } catch (e) {
      setError('Lumina could not surface insights right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="mb-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Reflection
          </div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05] mb-4">
            What Lumina notices.
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl">
            Patterns, tensions, and signals drawn from your context and recent threads — named plainly, the way a sharp confidant would.
          </p>
        </div>

        {!generated && !loading && (
          <div className="border border-dashed border-border rounded-2xl px-8 py-16 text-center">
            <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-4" strokeWidth={1.25} />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              Generate an insight pass whenever you want a step back. Best after a few conversations.
            </p>
            <Button onClick={handleGenerate} className="rounded-full px-6">
              Surface insights
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mb-3" />
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reading the pattern</p>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {generated && !loading && insights.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Not enough signal yet. Talk with Lumina for a while, then come back.
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-6 animate-fade-up">
            {insights.map((ins, i) => (
              <article
                key={i}
                className="group border-t border-border pt-6 first:border-t-0 first:pt-0"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-lg text-muted-foreground/60 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h2 className="font-serif text-xl tracking-tight text-foreground mb-2">
                      {ins.title}
                    </h2>
                    <p className="text-[15px] text-foreground/80 leading-relaxed">
                      {ins.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            <div className="pt-8 flex justify-center">
              <Button
                variant="ghost"
                onClick={handleGenerate}
                className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
              >
                Surface again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}