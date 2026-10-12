import React from 'react';
import BrandLogo from '@/components/brand/BrandLogo';

// Shown only while a reply request is genuinely in flight.
export default function ThinkingIndicator() {
  return (
    <div className="flex gap-3 md:gap-4 items-center" role="status" aria-live="polite">
      <span className="relative shrink-0">
        <span className="absolute -inset-1 rounded-xl bg-primary/20 animate-pulse-soft motion-reduce:animate-none" aria-hidden="true" />
        <BrandLogo size={26} alt="" className="relative" />
      </span>
      <span className="text-[13px] text-muted-foreground">LBC AI Is Working On A Reply…</span>
    </div>
  );
}