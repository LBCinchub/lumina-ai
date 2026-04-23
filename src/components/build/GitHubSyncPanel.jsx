import React, { useState } from 'react';
import { Github, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
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
      setStatus({ type: 'success', message: 'GitHub sync settings updated' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-5 py-4 border-b border-border/60">
        <h2 className="font-serif text-lg tracking-tight flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub Sync
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal p-5 space-y-6">
        {/* Repository */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository</label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
          <p className="text-xs text-muted-foreground">Format: username/repository</p>
        </div>

        {/* File path */}
        <div className="space-y-2">
          <label className="text-sm font-medium">File Path</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="path/to/file.html"
            className="w-full text-sm bg-muted/50 border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
          <p className="text-xs text-muted-foreground">Where to save the HTML file</p>
        </div>

        {/* Auto-sync toggle */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm font-medium">Auto-sync on save</span>
          </label>
          <p className="text-xs text-muted-foreground ml-7">
            Automatically push changes to GitHub when you build
          </p>
        </div>

        {/* Status */}
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
      </div>

      {/* Save button */}
      <div className="shrink-0 border-t border-border/60 p-5">
        <Button
          onClick={handleSave}
          disabled={saving || !repo || !path}
          className="w-full gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Github className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}