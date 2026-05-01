import React, { useState } from 'react';
import { Github, Save, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || 'index.html');
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
    <div className="flex flex-col h-full p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Github className="w-4 h-4 text-foreground/60" strokeWidth={1.75} />
        <h2 className="font-serif text-lg tracking-tight">GitHub Sync</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60 font-medium block mb-1.5">
            Repository (owner/repo)
          </label>
          <input
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="e.g. yourname/my-site"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.12em] text-muted-foreground/60 font-medium block mb-1.5">
            File path in repo
          </label>
          <input
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="e.g. index.html"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border/60">
          <div>
            <div className="text-sm font-medium">Auto-sync on build</div>
            <div className="text-xs text-muted-foreground/60">Push to GitHub every time you build</div>
          </div>
          <button onClick={() => setAutoSync(v => !v)} className="text-foreground/60 hover:text-foreground transition-colors">
            {autoSync
              ? <ToggleRight className="w-8 h-8 text-foreground" strokeWidth={1.5} />
              : <ToggleLeft className="w-8 h-8" strokeWidth={1.5} />
            }
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}