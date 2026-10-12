import React, { useEffect, useRef } from 'react';
import { PhoneOff } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

export default function LiveCallOverlay({ speaking, listening, isSending, onEnd }) {
  const endRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  // Escape ends the call; focus moves into the overlay and returns on close.
  useEffect(() => {
    const prev = document.activeElement;
    endRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onEndRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, []);
  const status = speaking
    ? 'Speaking…'
    : listening
      ? 'Listening…'
      : isSending
        ? 'Thinking…'
        : 'On call';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Soft ambient glow */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-700 pointer-events-none",
        speaking
          ? "opacity-100"
          : "opacity-0"
      )}>
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none" style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--accent) / 0.35) 0%, transparent 70%)'
        }} />
      </div>

      {/* Lumina orb */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Outer pulse ring */}
        <div className={cn(
          "absolute rounded-full border border-foreground/10 transition-all duration-500 pointer-events-none",
          (speaking || listening) ? "w-48 h-48 opacity-100 animate-ping motion-reduce:animate-none" : "w-36 h-36 opacity-0"
        )} style={{ animationDuration: '2s' }} />
        <div className={cn(
          "absolute rounded-full border border-foreground/15 transition-all duration-700 pointer-events-none",
          (speaking || listening) ? "w-40 h-40 opacity-100" : "w-28 h-28 opacity-0"
        )} />
        {/* Core */}
        <div className={cn(
          "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500",
          "bg-accent/40 border border-border",
          speaking && "scale-110",
          listening && "scale-105"
        )}>
          <BrandLogo size={64} alt="LBC AI" rounded />
        </div>
      </div>

      {/* Name */}
      <p className="font-serif text-2xl tracking-tight text-foreground mb-2">LBC AI</p>

      {/* Status */}
      <div className="flex items-center gap-2 mb-14">
        {(speaking || listening || isSending) && (
          <span className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-pulse-soft"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </span>
        )}
        <span className="text-sm text-muted-foreground">{status}</span>
      </div>

      {/* End call button */}
      <button
        ref={endRef}
        onClick={onEnd}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/80 active:scale-95 transition-all duration-150",
          "shadow-lg"
        )}
        aria-label="End call"
      >
        <PhoneOff className="w-6 h-6" strokeWidth={1.75} />
      </button>
      <p className="mt-3 text-xs text-muted-foreground/60 uppercase tracking-[0.14em]">End call</p>
    </div>
  );
}