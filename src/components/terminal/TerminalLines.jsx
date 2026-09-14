import React from 'react';
import { cn } from '@/lib/utils';

// Renders the terminal log. Line types carry the color: echoed commands,
// plain output, success, errors, and LBC AI replies.
const LINE_STYLES = {
  cmd: 'text-foreground',
  out: 'text-muted-foreground',
  ok: 'text-emerald-400',
  err: 'text-red-400',
  assistant: 'text-foreground/90',
  system: 'text-pink-400',
};

export default function TerminalLines({ lines }) {
  return (
    <div className="font-mono text-[12.5px] leading-relaxed space-y-1.5">
      {lines.map(l => (
        <div key={l.id} className={cn('whitespace-pre-wrap break-words', LINE_STYLES[l.type] || 'text-muted-foreground')}>
          {l.type === 'cmd' ? (
            <span><span className="text-pink-400">❯</span> {l.text}</span>
          ) : l.type === 'assistant' ? (
            <span><span className="text-purple-400">[LBC AI] </span>{l.text}</span>
          ) : (
            l.text
          )}
        </div>
      ))}
    </div>
  );
}