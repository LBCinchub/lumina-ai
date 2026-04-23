import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Github, Link as LinkIcon, Unlink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSave = async () => {
    if (!repo.trim() || !path.trim()) {
      setStatus({ type: 'error', message: 'Repository and file path are required' });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      await onUpdate({
        github_repo: repo,
        github_path: path,
        github_auto_sync: autoSync
      });
      setStatus({ type: 'success', message: 'GitHub sync configured' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-5">
      <div>
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Auto-Sync
        </h3>
        <p className="text-sm text-muted-foreground">
          Push your builds directly to a GitHub repository automatically.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Repository</label>
          <input
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">Format: username/repository</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">File Path</label>
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="path/to/index.html"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={saving}
          />
          <p className="text-xs text-muted-foreground">Where to save the file in the repo</p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
          <input
            type="checkbox"
            id="autoSync"
            checked={autoSync}
            onChange={e => setAutoSync(e.target.checked)}
            disabled={saving}
            className="rounded"
          />
          <label htmlFor="autoSync" className="text-sm font-medium cursor-pointer flex-1">
            Auto-push on build
          </label>
        </div>

        {status && (
          <div className={cn(
            "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
            status.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
          )}>
            {status.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {status.message}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !repo.trim() || !path.trim()}
          className="w-full gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}