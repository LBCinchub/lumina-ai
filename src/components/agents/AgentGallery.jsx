import React from 'react';
import {
  Bot, Plus, Pencil, Archive, Undo2, MessageSquare, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { voiceLabel } from './agentTemplates';

// Gallery of the user's own agents. All data arrives RLS-scoped from the
// server — only the signed-in user's agents ever appear here.
export default function AgentGallery({
  agents, loading, error, limit, actionError,
  onRetry, onCreate, onOpenChat, onEdit, onArchive, onRestore,
}) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const atLimit = activeCount >= limit;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="shrink-0 px-5 md:px-8 py-4 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-lg tracking-tight">My Agents</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {activeCount} Of {limit} Active Agents · Free Plan
          </p>
        </div>
        <button
          onClick={onCreate}
          disabled={atLimit}
          title={atLimit ? `Free Plan Limit: ${limit} Active Agents — Archive One To Create Another` : 'Create Agent'}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[12px] font-medium transition-all",
            atLimit
              ? "opacity-40 cursor-not-allowed bg-primary text-primary-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Create Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-5 md:px-8 py-5">
        {actionError && (
          <div className="mb-4 flex items-center gap-2 text-[12px] text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-36 rounded-lg border border-border/40 bg-muted/20 animate-pulse-soft" />
            ))}
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <AlertTriangle className="w-7 h-7 text-muted-foreground/50 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-border/60 text-[12px] hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              Try Again
            </button>
          </div>
        ) : agents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-foreground/70" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-lg tracking-tight mb-1">No Agents Yet</h3>
            <p className="text-[12px] text-muted-foreground max-w-xs leading-relaxed mb-5">
              Build your own AI agent in under a minute — pick a template, tune the instructions, and start chatting.
            </p>
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 animate-fade-up">
            {agents.map(a => {
              const archived = a.status === 'archived';
              return (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-lg border border-border/40 bg-muted/15 p-4 flex flex-col gap-3",
                    archived && "opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-foreground/70" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {a.persona} · {voiceLabel(a.voice)}
                        </div>
                      </div>
                    </div>
                    {archived && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                        Archived
                      </span>
                    )}
                  </div>

                  <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                    {a.expertise || a.instructions || 'No expertise description.'}
                  </p>

                  <div className="flex items-center gap-1.5 mt-auto pt-1">
                    <button
                      onClick={() => onOpenChat(a)}
                      disabled={archived}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-colors",
                        archived
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "bg-primary/15 text-primary hover:bg-primary/25"
                      )}
                    >
                      <MessageSquare className="w-3 h-3" strokeWidth={2} />
                      Open Chat
                    </button>
                    <button
                      onClick={() => onEdit(a)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    {archived ? (
                      <button
                        onClick={() => onRestore(a)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                        title="Restore"
                      >
                        <Undo2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onArchive(a)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}