import React from 'react';
import { Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationList({ conversations, activeId, onSelect, onNew, isLoading }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5">
        <button
          onClick={onNew}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
            "border border-border/70 bg-card hover:bg-accent transition-colors",
            "text-sm font-medium text-foreground"
          )}
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          New thread
        </button>
      </div>

      <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
        Recent
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-2 pb-4 space-y-0.5">
        {isLoading ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
            No conversations yet.
          </div>
        ) : (
          conversations.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md transition-colors group",
                "hover:bg-accent/60",
                activeId === c.id && "bg-accent"
              )}
            >
              <div className="text-sm text-foreground truncate leading-snug">
                {c.title || 'Untitled'}
              </div>
              {c.last_message_at && (
                <div className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}