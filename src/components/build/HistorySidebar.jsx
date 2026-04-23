import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, GitBranch, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HistorySidebar({ projectId, onRevert, onBranch }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const history = await base44.entities.ProjectHistory.filter(
          { project_id: projectId },
          '-created_date',
          50
        );
        setSnapshots(history);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm p-4">
        <History className="w-8 h-8 opacity-30 mb-2" />
        <p>No project selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm p-4">
        <History className="w-8 h-8 opacity-30 mb-2" />
        <p>No history yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border/60">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <History className="w-4 h-4" />
          History
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal">
        <div className="p-3 space-y-2">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-card transition-colors space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {snapshot.title || 'Untitled snapshot'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(snapshot.created_date).toLocaleDateString()}
                  </p>
                </div>
                {snapshot.is_auto && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    Auto
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRevert(snapshot)}
                  className="flex-1 h-7 gap-1 text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revert
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onBranch(snapshot)}
                  className="flex-1 h-7 gap-1 text-xs"
                >
                  <GitBranch className="w-3 h-3" />
                  Branch
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}