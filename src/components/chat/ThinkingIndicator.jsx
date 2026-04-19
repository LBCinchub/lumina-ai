import React from 'react';
import LuminaMark from '@/components/layout/LuminaMark';

export default function ThinkingIndicator() {
  return (
    <div className="flex gap-4 animate-fade-up">
      <div className="shrink-0 mt-1">
        <LuminaMark size={22} className="text-foreground/80" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse-soft" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}