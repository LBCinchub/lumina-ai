import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, RotateCcw, GitBranch, Loader2, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [projectId]);

  const loadHistory = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await base44.entities.ProjectHistory.filter(
        { project_id: projectId },
        '-created_date',
        50
      );
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (snapshot) => {
    setReverting(snapshot.id);
    try {
      await onRevert(snapshot);
      // Refresh history
      loadHistory();
    } finally {
      setReverting(null);
    }
  };

  const handleBranch = async (snapshot) => {
    await onBranch(snapshot);
    loadHistory();
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.ProjectHistory.delete(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  };

  if (!projectId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Select a project to view history
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <Clock className="w-4 h-4 text-foreground/60" />
        <h2 className="text-sm font-medium">History</h2>
        <span className="text-xs text-muted-foreground ml-auto">{history.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground/60">
            No history yet. Build something to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {history.map((snapshot, idx) => (
              <div
                key={snapshot.id}
                className="p-3 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {snapshot.title || `Snapshot ${history.length - idx}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(snapshot.created_date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {snapshot.branch && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 flex items-center gap-1 shrink-0">
                      <GitBranch className="w-2.5 h-2.5" />
                      {snapshot.branch}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRevert(snapshot)}
                    disabled={reverting === snapshot.id}
                    className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-accent/60 hover:bg-accent text-foreground/80 transition-colors disabled:opacity-50"
                    title="Revert to this version"
                  >
                    {reverting === snapshot.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Revert
                  </button>

                  <button
                    onClick={() => handleBranch(snapshot)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
                    title="Create branch from this version"
                  >
                    <GitBranch className="w-3 h-3" />
                    Branch
                  </button>

                  <button
                    onClick={() => handleDelete(snapshot.id)}
                    className="px-1.5 py-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}