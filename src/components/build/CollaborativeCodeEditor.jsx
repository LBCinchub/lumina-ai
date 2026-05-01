import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CollaborativeCodeEditor({ code = '', onCodeChange, projectId, collaborators = [], currentUser }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40 shrink-0">
        <span className="text-xs text-muted-foreground font-mono">index.html</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea
        className={cn(
          "flex-1 w-full resize-none outline-none p-4 font-mono text-[13px] leading-relaxed",
          "bg-card text-foreground scrollbar-minimal"
        )}
        value={code}
        onChange={e => onCodeChange?.(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}