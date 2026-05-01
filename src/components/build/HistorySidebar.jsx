import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) { setSnapshots([]); return; }
    setLoading(true);
    base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 20)
      .then(setSnapshots)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
        Select a project to view history.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60 shrink-0 flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/60 font-medium">History</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 py-6 text-xs text-muted-foreground/60 text-center">No snapshots yet.</div>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} className="px-3 py-2.5 hover:bg-accent/60 group rounded mx-1 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground/80 truncate">{snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {snap.created_date ? formatDistanceToNow(new Date(snap.created_date), { addSuffix: true }) : ''}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onRevert?.(snap)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Revert to this"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onBranch?.(snap)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Branch from here"
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