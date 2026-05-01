import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Github, Save, RefreshCw, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GitHubSyncPanel({ project, onUpdate }) {
  const [repo, setRepo] = useState(project?.github_repo || '');
  const [path, setPath] = useState(project?.github_path || 'index.html');
  const [autoSync, setAutoSync] = useState(project?.github_auto_sync || false);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate?.({ github_repo: repo, github_path: path, github_auto_sync: autoSync });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const pushNow = async () => {
    if (!project?.html || !repo || !path) return;
    setPushing(true);
    try {
      await base44.functions.invoke('luminaPushCode', {
        repo,
        path,
        content: project.html,
        message: `build: manual push via Lumina - ${new Date().toLocaleString()}`
      });
    } catch (err) {
      console.error('Push failed:', err);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Github className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="text-sm font-medium">GitHub Sync</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-[0.12em] block mb-1.5">
            Repository (owner/repo)
          </label>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="e.g. username/my-site"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-[0.12em] block mb-1.5">
            File path in repo
          </label>
          <input
            type="text"
            value={path}
            onChange={e => setPath(e.target.value)}
            placeholder="e.g. index.html or public/index.html"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setAutoSync(v => !v)}
            className={cn(
              "w-9 h-5 rounded-full transition-colors relative",
              autoSync ? "bg-foreground" : "bg-muted"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform",
              autoSync ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
          <span className="text-sm text-foreground/80">Auto-sync on every build</span>
        </label>

        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save config'}
          </button>

          {repo && path && project?.html && (
            <button
              onClick={pushNow}
              disabled={pushing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Push now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}