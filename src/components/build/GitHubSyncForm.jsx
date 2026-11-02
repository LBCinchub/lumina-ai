import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const FIELDS = [
  { key: 'repo', label: 'Repository (Owner/Repo Or GitHub URL)', placeholder: 'your-name/coffee-shop' },
  { key: 'branch', label: 'Branch', placeholder: 'main' },
  { key: 'path', label: 'File Path', placeholder: 'index.html' },
];

// Where to sync the project: repository, branch and file path.
export default function GitHubSyncForm({ form, onChange, busy, error, onCancel, onSubmit }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Sync To GitHub</DialogTitle>
        <DialogDescription>
          Commits This Project's Saved Page To A Repository Your Own GitHub Account Can Write To. You Review It Before Anything Is Pushed.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={`sync-${f.key}`} className="block text-xs text-muted-foreground mb-1.5">{f.label}</label>
            <input
              id={`sync-${f.key}`}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={e => onChange(f.key, e.target.value)}
              spellCheck={false}
              autoComplete="off"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[12.5px] outline-none focus:border-primary/50"
            />
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}{' '}
          {error.code === 'no_connection' && <Link to="/github" className="underline">Connect GitHub</Link>}
        </p>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={onSubmit} disabled={busy || !form.repo.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Github />} Review Sync
        </Button>
      </DialogFooter>
      <p className="text-[11px] text-muted-foreground">
        Not Connected Yet? <Link to="/github" className="underline">Manage Your GitHub Connection</Link>
      </p>
    </>
  );
}