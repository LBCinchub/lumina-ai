import React, { useState } from 'react';
import { Github, ToggleLeft, ToggleRight, Save } from 'lucide-react';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || '');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ github_repo: repo, github_path: path, github_auto_sync: autoSync });
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-minimal p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Github className="w-5 h-5 text-foreground/60" />
          <h2 className="font-serif text-xl tracking-tight">GitHub Sync</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60 mb-1.5 block">Repository (owner/repo)</label>
            <input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="e.g. username/my-project"
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60 mb-1.5 block">File path in repo</label>
            <input
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="e.g. public/index.html"
              className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div>
              <p className="text-sm font-medium">Auto-sync on build</p>
              <p className="text-xs text-muted-foreground mt-0.5">Push to GitHub every time you build</p>
            </div>
            <button onClick={() => setAutoSync(a => !a)} className="text-foreground/60 hover:text-foreground transition-colors">
              {autoSync ? <ToggleRight className="w-8 h-8 text-foreground" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save configuration'}
        </button>
      </div>
    </div>
  );
}