import React, { useState } from 'react';
import { Github, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="max-w-lg space-y-5">
        <div className="flex items-center gap-2 mb-6">
          <Github className="w-4 h-4 text-foreground/60" />
          <h2 className="text-sm font-medium">GitHub Sync</h2>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Repository (owner/repo)</label>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="e.g. myorg/myrepo"
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">File path in repo</label>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="e.g. public/index.html"
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Auto-sync on build</p>
            <p className="text-xs text-muted-foreground">Push to GitHub every time you build</p>
          </div>
          <button onClick={() => setAutoSync(a => !a)} className="text-foreground/60 hover:text-foreground transition-colors">
            {autoSync
              ? <ToggleRight className="w-6 h-6 text-foreground" />
              : <ToggleLeft className="w-6 h-6" />}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !repo || !path}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Config'}
        </button>
      </div>
    </div>
  );
}