import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 20)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground text-sm">
        Select a project to view history.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-sm font-medium">Version History</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {loading ? (
          <div className="px-5 py-3 text-xs text-muted-foreground">Loading…</div>
        ) : history.length === 0 ? (
          <div className="px-5 py-3 text-xs text-muted-foreground/60">No snapshots yet</div>
        ) : (
          history.map(snap => (
            <div key={snap.id} className="px-4 py-3 border-b border-border/40 hover:bg-accent/40 transition-colors group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {snap.branch ? (
                      <GitBranch className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
                    ) : (
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" strokeWidth={1.75} />
                    )}
                    <span className="text-xs font-medium truncate">{snap.title || (snap.is_auto ? 'Auto-save' : 'Manual save')}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/60">
                    {snap.created_date ? formatDistanceToNow(new Date(snap.created_date), { addSuffix: true }) : '—'}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onRevert(snap)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Revert to this version"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onBranch(snap)}
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