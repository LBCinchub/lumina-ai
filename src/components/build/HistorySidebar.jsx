import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 20)
      .then(setSnapshots)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
        Save a project to see its history.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/70">Version History</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground/60">No snapshots yet.</div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              className="group px-4 py-3 border-b border-border/40 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(snap.created_date), { addSuffix: true })}
                    </span>
                  </div>
                  {snap.title && (
                    <p className="text-xs text-foreground/80 truncate">{snap.title}</p>
                  )}
                  <span className={cn(
                    "text-[9px] font-mono uppercase tracking-wider",
                    snap.is_auto ? "text-muted-foreground/50" : "text-foreground/60"
                  )}>
                    {snap.branch ? `branch: ${snap.branch}` : snap.is_auto ? 'auto-save' : 'manual'}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onRevert(snap)}
                    title="Revert to this snapshot"
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onBranch(snap)}
                    title="Branch from here"
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <GitBranch className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}