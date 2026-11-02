import React from 'react';
import { cn } from '@/lib/utils';

const STYLES = ['terse', 'balanced', 'chatty'];

// Confidence, learned traits and reply style of the user's own twin. Until it
// has five interactions it only says it is still learning.
export default function TwinProfileDetails({ profile, onStyle, traitLimit = 4 }) {
  if (!profile || (profile.interaction_count || 0) < 5) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Your Twin is still learning your preferences. Keep using LBC AI to help it improve.
      </p>
    );
  }
  const confidence = profile.confidence_score || 0;
  const traits = Array.isArray(profile.learned_traits) ? profile.learned_traits : [];

  return (
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
          {traits.slice(0, traitLimit).map((t, i) => (
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
          {STYLES.map(s => (
            <button
              key={s}
              type="button"
              aria-pressed={profile.communication_style === s}
              onClick={() => onStyle(s)}
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
  );
}