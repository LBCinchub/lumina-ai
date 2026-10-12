import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function JumpToLatest({ visible, hasNew, onClick }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-card text-foreground border border-border shadow-lg text-[13px] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={hasNew ? 'New Reply, Jump To Latest' : 'Jump To Latest'}
    >
      <ChevronDown className="w-4 h-4" aria-hidden="true" />
      {hasNew ? 'New Reply' : 'Jump To Latest'}
    </button>
  );
}