import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { History, RotateCcw, GitBranch, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!projectId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    try {
      const data = await base44.entities.ProjectHistory.filter({ project_id: projectId }, '-created_date', 50);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await base44.entities.ProjectHistory.delete(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Failed to delete history entry:', err);
    }
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <History className="w-8 h-8 text-muted-foreground/30 mb-3" strokeWidth={1.5} />
        <p className="text-xs text-muted-foreground">Select a project to view history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar/30">
      <div className="px-4 py-4 border-b border-border/60 flex items-center justify-between bg-sidebar/60">
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground/60 font-medium flex items-center gap-2">
          <History className="w-3.5 h-3.5" />
          History
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-minimal p-3 space-y-3">
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-4">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 text-center py-4">No history snapshots yet</div>
        ) : (
          history.map((item, idx) => (
            <div 
              key={item.id}
              className="bg-card border border-border/60 rounded-xl p-3 hover:border-foreground/20 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.is_auto ? (
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {item.title || (item.is_auto ? 'Auto-save' : 'Manual save')}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="text-[10px] text-muted-foreground mb-3">
                {item.created_date ? formatDistanceToNow(new Date(item.created_date), { addSuffix: true }) : 'Unknown time'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRevert(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </button>
                <button
                  onClick={() => onBranch(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border border-border hover:bg-accent text-[11px] font-medium transition-colors"
                >
                  <GitBranch className="w-3 h-3" />
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