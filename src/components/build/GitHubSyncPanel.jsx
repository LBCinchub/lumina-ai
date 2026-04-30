import React, { useState } from 'react';
import { Github, Save, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ github_repo: repo, github_path: path, github_auto_sync: autoSync });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5 text-foreground/60" />
          <h2 className="text-lg font-medium">GitHub Sync</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Repository (owner/repo)</label>
            <input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="e.g. myuser/myrepo"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-mono focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">File path in repo</label>
            <input
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="e.g. index.html"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm font-mono focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <button
            onClick={() => setAutoSync(v => !v)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left"
          >
            {autoSync
              ? <ToggleRight className="w-5 h-5 text-foreground" />
              : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">Auto-sync on build</p>
              <p className="text-xs text-muted-foreground">Push to GitHub every time Lumina generates code</p>
            </div>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
          </button>

          {repo && (
            <a
              href={`https://github.com/${repo}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open {repo} on GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
}