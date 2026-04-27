import React, { useState } from 'react';
import { Github, Check, Loader2 } from 'lucide-react';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || 'index.html');
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
      <div className="max-w-xl space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Github className="w-5 h-5 text-foreground/60" />
          <h2 className="text-lg font-medium">GitHub Sync</h2>
        </div>
        <p className="text-sm text-muted-foreground">Auto-push your built HTML to a GitHub repository on every build.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">Repository <span className="text-muted-foreground font-normal">(owner/repo)</span></label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="e.g. lbc-network/my-site"
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1.5">File path in repo</label>
            <input
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="e.g. public/index.html"
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoSync(a => !a)}
              className={`w-10 h-5 rounded-full transition-colors ${autoSync ? 'bg-foreground' : 'bg-muted'}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${autoSync ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-foreground/80">Auto-sync on every build</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !repo}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Github className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Config'}
        </button>
      </div>
    </div>
  );
}