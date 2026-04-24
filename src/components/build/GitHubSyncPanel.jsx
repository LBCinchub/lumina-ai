import React, { useState } from 'react';
import { Github, Save } from 'lucide-react';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ github_repo: repo, github_path: path, github_auto_sync: autoSync });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-6">
      <div className="max-w-md space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-4 h-4 text-foreground/60" />
          <h2 className="text-sm font-medium">GitHub Sync</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Repository (owner/repo)</label>
            <input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="e.g. username/my-repo"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">File path in repo</label>
            <input
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="e.g. index.html"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={e => setAutoSync(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-foreground/80">Auto-sync on every build</span>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Config'}
        </button>
      </div>
    </div>
  );
}