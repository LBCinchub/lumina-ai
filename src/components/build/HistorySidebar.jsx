import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) { setSnapshots([]); return; }
    setLoading(true);
    base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 30)
      .then(data => { setSnapshots(data); setLoading(false); })
      .catch(() => setLoading(false));
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
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <History className="w-4 h-4 text-foreground/60" strokeWidth={1.5} />
        <span className="text-sm font-medium">Version History</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 py-6 text-xs text-muted-foreground text-center">No history yet.</div>
        ) : (
          snapshots.map(snap => (
            <div key={snap.id} className="group px-4 py-3 border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}</p>
                  {snap.branch && <p className="text-[10px] text-muted-foreground">Branch: {snap.branch}</p>}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(snap.created_date), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onRevert(snap)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Revert to this version"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onBranch(snap)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
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