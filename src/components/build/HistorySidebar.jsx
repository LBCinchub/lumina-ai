import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, RotateCcw, GitBranch, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-4 text-center">
        Select a project to view history.
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
          <div className="px-4 py-6 text-xs text-muted-foreground/60 text-center">No history yet.</div>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} className="group px-3 py-2.5 hover:bg-accent/50 rounded mx-1 transition-colors">
              <div className="flex items-start gap-2">
                <Clock className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/70 truncate">{snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {formatDistanceToNow(new Date(snap.created_date), { addSuffix: true })}
                  </p>
                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onRevert(snap)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Revert
                    </button>
                    <button
                      onClick={() => onBranch(snap)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <GitBranch className="w-2.5 h-2.5" /> Branch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}