import React, { useState } from 'react';
import { Github, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        github_repo: repo,
        github_path: path,
        github_auto_sync: autoSync
      });
    } finally {
      setSaving(false);
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(`${repo}/${path}`);
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
        <p className="text-sm text-muted-foreground">Auto-sync project to GitHub repository.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 block">
            Repository (owner/repo)
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="myuser/myrepo"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-foreground/50"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 block">
            File Path
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="src/index.html"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-foreground/50"
          />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50">
          <input
            type="checkbox"
            id="auto-sync"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
          />
          <label htmlFor="auto-sync" className="text-sm cursor-pointer flex-1">
            Auto-sync on build
          </label>
        </div>

        {repo && path && (
          <div className="p-3 rounded-lg bg-accent/50 border border-border flex items-center justify-between">
            <code className="text-xs text-foreground/80 font-mono">{repo}/{path}</code>
            <button
              onClick={copyPath}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {!repo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Configure repository to enable GitHub sync.</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !repo || !path}
          className="flex-1"
        >
          {saving ? 'Saving…' : 'Save Config'}
        </Button>
      </div>
    </div>
  );
}