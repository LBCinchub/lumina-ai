import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 20)
      .then(data => setSnapshots(data))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
        Select a project to view its history.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/60 font-medium">Version History</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="px-5 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="px-5 py-6 text-xs text-muted-foreground/60 text-center">No snapshots yet.</div>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} className="px-4 py-3 border-b border-border/40 hover:bg-accent/40 transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <span className="text-xs text-foreground/80 truncate">
                  {snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}
                </span>
                {snap.branch && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground/60 shrink-0">
                    {snap.branch}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/50 mb-2">
                {formatDistanceToNow(new Date(snap.created_date), { addSuffix: true })}
              </p>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRevert(snap)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-accent hover:bg-foreground/10 text-foreground/70 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Revert
                </button>
                <button
                  onClick={() => onBranch(snap)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-accent hover:bg-foreground/10 text-foreground/70 transition-colors"
                >
                  <GitBranch className="w-3 h-3" /> Branch
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}