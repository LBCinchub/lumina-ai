import React, { useState, useEffect } from 'react';
import { Github, Copy, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const copyCommand = () => {
    const cmd = `npx gh repo clone ${repo}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Github className="w-5 h-5 text-foreground/60" />
          <h2 className="text-lg font-medium">GitHub Sync Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Repository <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repo"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Format: GitHub username or organization/repository</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              File Path <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="src/index.html"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Path to the file in the repository where changes will be synced</p>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
            <input
              type="checkbox"
              id="autosync"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autosync" className="text-sm text-foreground/80 cursor-pointer flex-1">
              Auto-sync to GitHub on save
            </label>
          </div>

          {autoSync && repo && path && (
            <div className="p-4 rounded-lg border border-border/60 bg-accent/10 flex gap-3">
              <AlertCircle className="w-4 h-4 text-accent-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-accent-foreground">
                Enabled: Changes will be automatically pushed to <code className="font-mono">{path}</code> in <code className="font-mono">{repo}</code>
              </p>
            </div>
          )}
        </div>

        {repo && (
          <div className="p-4 rounded-lg border border-border bg-card">
            <p className="text-xs font-medium text-foreground/70 mb-2">Quick Clone</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/60 px-3 py-2 rounded text-foreground/80 truncate">
                npx gh repo clone {repo}
              </code>
              <button
                onClick={copyCommand}
                className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !repo || !path}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/60">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground/70">Note:</span> You'll need to authorize this app with GitHub to enable syncing. Push access to the repository is required.
          </p>
        </div>
      </div>
    </div>
  );
}