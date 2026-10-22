import React from 'react';
import { History, Plus, SlidersHorizontal, Search, FileText, ImageIcon, Download, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

function Btn({ icon: Icon, label, onClick, showLabel = true, active }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 min-w-[44px] h-11 md:h-9 md:min-w-0 px-2.5 justify-center rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'text-primary bg-accent'
      )}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      {showLabel && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
}

export default function ChatHeader({ title, hasThread, voiceMode, onHistory, onNew, onContext, onDeepSearch, onDraft, onImage, onExport, onVoice }) {
  return (
    <div className="absolute top-0 inset-x-0 z-10 bg-background/90 border-b border-border/70">
      <div className="flex items-center gap-1 px-2 md:px-4 h-14">
        <Btn icon={History} label="History" onClick={onHistory} />
        <Btn icon={Plus} label="New Chat" onClick={onNew} showLabel={false} />
        {/* Thread title is user/AI content — shown as-is. */}
        <div className="flex-1 min-w-0 px-2 text-sm font-medium text-foreground/85 truncate">{title}</div>
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <Btn icon={Search} label="Deep Search" onClick={onDeepSearch} />
          {hasThread && <Btn icon={FileText} label="Draft" onClick={onDraft} />}
          <Btn icon={ImageIcon} label="Image" onClick={onImage} />
          {hasThread && <Btn icon={Download} label="Export" onClick={onExport} />}
          <Btn icon={Phone} label={voiceMode ? 'End Voice' : 'Voice'} onClick={onVoice} active={voiceMode} />
          <Btn icon={SlidersHorizontal} label="Context" onClick={onContext} />
        </div>
      </div>
    </div>
  );
}