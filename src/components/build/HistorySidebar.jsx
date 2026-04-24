import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, RotateCcw, GitBranch, Clock } from 'lucide-react';
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
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
        Save a project to see its history.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground/80">Version History</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground/60">No snapshots yet.</div>
        ) : (
          snapshots.map(snap => (
            <div
              key={snap.id}
              className="px-4 py-3 border-b border-border/40 group hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground/70 truncate">
                    {snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}
                  </span>
                </div>
                {snap.branch && (
                  <span className="text-[9px] bg-accent text-foreground/60 px-1.5 py-0.5 rounded shrink-0">
                    {snap.branch}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-2">
                {formatDistanceToNow(new Date(snap.created_date), { addSuffix: true })}
              </p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRevert(snap)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors",
                    "bg-accent hover:bg-accent/80 text-foreground/70 hover:text-foreground"
                  )}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Revert
                </button>
                <button
                  onClick={() => onBranch(snap)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors",
                    "bg-accent hover:bg-accent/80 text-foreground/70 hover:text-foreground"
                  )}
                >
                  <GitBranch className="w-2.5 h-2.5" />
                  Branch
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}