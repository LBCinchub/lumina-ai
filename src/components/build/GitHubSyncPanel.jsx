import React, { useState } from 'react';
import { Github, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!repo.trim() || !path.trim()) {
      setFeedback({ type: 'error', message: 'Repository and path are required' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await onUpdate({
        github_repo: repo.trim(),
        github_path: path.trim(),
        github_auto_sync: autoSync
      });
      setFeedback({ type: 'success', message: 'GitHub sync configured' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const copyCommand = () => {
    navigator.clipboard.writeText(project?.id || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6 space-y-6">
      <div>
        <h3 className="font-medium mb-1 flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Sync
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically sync your design to a GitHub repository on save.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Repository (owner/repo)</label>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="e.g. myusername/myrepo"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your GitHub repository in owner/repo format.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">File Path</label>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="e.g. src/index.html"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Path to the file in your repository where the design will be saved.
          </p>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/60 transition-colors">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={e => setAutoSync(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm font-medium flex-1">Auto-sync on save</span>
        </label>
      </div>

      {feedback && (
        <div className={cn(
          "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
          feedback.type === 'success' ? "bg-green-500/10 text-green-700" : "bg-destructive/10 text-destructive"
        )}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {feedback.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !repo.trim() || !path.trim()}
          className="flex-1"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </Button>
      </div>

      {project?.id && (
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-2">Project ID</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-background px-2 py-1 rounded flex-1 truncate">
              {project.id}
            </code>
            <button
              onClick={copyCommand}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}