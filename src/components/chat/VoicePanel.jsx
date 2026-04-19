import React from 'react';
import { Radio, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import LuminaMark from '@/components/layout/LuminaMark';

export default function VoicePanel({ voiceMode, speaking, listening, onToggle }) {
  return (
    <div className="px-3 pb-4 border-t border-sidebar-border pt-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50 mb-2 px-1">
        Voice chat
      </div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm",
          voiceMode
            ? "bg-accent text-foreground border border-border"
            : "border border-border/60 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )}
      >
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          voiceMode ? "bg-foreground/10" : "bg-muted"
        )}>
          {voiceMode && speaking ? (
            <LuminaMark size={14} className={cn("text-foreground", speaking && "animate-pulse")} />
          ) : voiceMode && listening ? (
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" strokeWidth={1.75} />
          ) : voiceMode ? (
            <MicOff className="w-3.5 h-3.5 text-foreground/50" strokeWidth={1.75} />
          ) : (
            <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
        </div>
        <div className="flex-1 text-left leading-tight">
          <div className="font-medium text-[13px]">
            {voiceMode ? 'Live — tap to end' : 'Start live chat'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {voiceMode
              ? speaking ? 'Lumina is speaking…' : listening ? 'Listening…' : 'Waiting…'
              : 'Speak · Lumina responds aloud'}
          </div>
        </div>
        {voiceMode && (
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
        )}
      </button>
    </div>
  );
}