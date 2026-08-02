import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Context scope toggle for the Converse workspace. Only the user's own
// memories are exposed here; cross-platform "sister" browsing has been removed.
export default function ContextToggle({ currentContext, onContextChange }) {
  return (
    <div className="border-t border-border/60 pt-4 px-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">Context</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground">Your memories</span>
      </div>
      <Button
        onClick={() => onContextChange({ contextType: 'yours' })}
        variant={currentContext === 'yours' ? 'default' : 'outline'}
        className="w-full justify-start text-xs"
      >
        <Sparkles className="w-3.5 h-3.5 mr-2" />
        Your conversation history
      </Button>
    </div>
  );
}