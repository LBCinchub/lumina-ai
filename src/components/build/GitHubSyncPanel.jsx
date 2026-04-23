import React, { useState } from 'react';
import { Github, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || 'index.html');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await onUpdate({
        github_repo: repo,
        github_path: path,
        github_auto_sync: autoSync
      });
      setStatus({ type: 'success', message: 'GitHub sync configured' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-5 border-t border-border">
      <h3 className="flex items-center gap-2 font-medium text-sm">
        <Github className="w-4 h-4" />
        Auto-Sync to GitHub
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            Repository
          </label>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
            File Path
          </label>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="index.html"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-sm text-foreground/80">Auto-push on every save</span>
        </label>
      </div>

      {status && (
        <div className={cn(
          "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
          status.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
        )}>
          {status.type === 'success'
            ? <Check className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {status.message}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !repo || !path}
        className="w-full gap-2"
        size="sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
        Save Configuration
      </Button>
    </div>
  );
}