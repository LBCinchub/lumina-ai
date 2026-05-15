import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, GitBranch, RotateCcw, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.ProjectHistory.filter(
          { project_id: projectId },
          '-created_date',
          20
        );
        setHistory(data);
      } catch (_) {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <span>Create or select a project</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground text-sm">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <span>No history yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">History</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        <div className="space-y-1 p-2">
          {history.map((snapshot) => {
            const date = new Date(snapshot.created_date);
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const label = snapshot.title || `Snapshot ${timeStr}`;

            return (
              <div
                key={snapshot.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 hover:bg-accent/60 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/80 truncate">{label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{timeStr}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onRevert(snapshot)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Revert to this snapshot"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => onBranch(snapshot)}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Create branch from this snapshot"
                  >
                    <GitBranch className="w-3 h-3" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}