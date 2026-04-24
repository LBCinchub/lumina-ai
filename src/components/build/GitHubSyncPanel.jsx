import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Github, Save, ToggleLeft, ToggleRight } from 'lucide-react';

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
    <div className="flex-1 overflow-y-auto p-6 max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <Github className="w-4 h-4 text-foreground/70" strokeWidth={1.75} />
        <h2 className="font-serif text-lg tracking-tight">GitHub Sync</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Repository (owner/repo)</label>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="e.g. mokhtar/lbc-hub"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">File path in repo</label>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="e.g. index.html"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border/60">
          <div>
            <p className="text-sm font-medium">Auto-sync on build</p>
            <p className="text-xs text-muted-foreground">Push to GitHub every time you build</p>
          </div>
          <button onClick={() => setAutoSync(v => !v)} className="text-foreground/70 hover:text-foreground transition-colors">
            {autoSync
              ? <ToggleRight className="w-7 h-7 text-foreground" />
              : <ToggleLeft className="w-7 h-7" />
            }
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Config'}
        </button>
      </div>
    </div>
  );
}