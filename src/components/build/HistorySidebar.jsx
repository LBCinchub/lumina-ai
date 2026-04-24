import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RotateCcw, GitBranch, Clock } from 'lucide-react';
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
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
        Select a project to view history.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
        Loading…
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
        No history yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border/60">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/60 font-medium">Version History</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-minimal py-2">
        {history.map((snapshot, i) => (
          <div key={snapshot.id} className="px-3 py-2.5 border-b border-border/40 last:border-0 hover:bg-accent/40 transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground/80 truncate">
                    {snapshot.title || (snapshot.is_auto ? 'Auto-save' : 'Manual save')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(snapshot.created_date), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => onRevert(snapshot)}
                  title="Revert to this version"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onBranch(snapshot)}
                  title="Branch from here"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <GitBranch className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}