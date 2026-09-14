import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Github, CheckCircle2, ExternalLink } from 'lucide-react';

// Back up every saved command template to a GitHub repository. Runs through
// the server-side confirmation flow — the preview step shows exactly what
// will be committed before anything is pushed.

const DEFAULT_PATH = 'backups/terminal-templates.json';

export default function GitHubBackup({ open, onOpenChange, templateCount }) {
  const [repo, setRepo] = useState('');
  const [path, setPath] = useState(DEFAULT_PATH);
  const [branch, setBranch] = useState('main');
  const [step, setStep] = useState('form'); // form | preview | success
  const [preview, setPreview] = useState(null);
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep('form');
    setPreview(null);
    setToken('');
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (o) => {
    if (!o && busy) return;
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  const invoke = async (payload) => {
    const res = await base44.functions.invoke('pushTemplatesBackup', payload);
    return res?.data || res || {};
  };

  const handleError = (err) =>
    setError(err?.response?.data?.error || err?.data?.error || err?.error || 'The Backup Failed — Please Try Again.');

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await invoke({
        repo: repo.trim(),
        path: path.trim() || DEFAULT_PATH,
        branch: branch.trim() || 'main',
      });
      if (data.requires_confirmation) {
        setPreview(data.preview);
        setToken(data.confirmation_token);
        setStep('preview');
      } else {
        setError(data.error || 'The Backup Failed — Please Try Again.');
      }
    } catch (err) {
      handleError(err);
    }
    setBusy(false);
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await invoke({
        repo: preview.repo,
        path: preview.path,
        branch: preview.branch,
        confirmation_token: token,
      });
      if (data.success) {
        setResult(data);
        setStep('success');
      } else {
        setError(data.error || 'The Backup Failed — Please Try Again.');
      }
    } catch (err) {
      handleError(err);
    }
    setBusy(false);
  };

  const inputClass = 'w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[12.5px] outline-none focus:border-pink-400/50';
  const labelClass = 'block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Back Up Templates To GitHub</DialogTitle>
              <DialogDescription>
                All {templateCount} Saved Templates Are Exported As One Versioned JSON Backup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Repository — owner/repo</label>
                <input
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  placeholder="LBCinchub/automation"
                  spellCheck={false}
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Branch</label>
                  <input
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>File Path</label>
                  <input
                    value={path}
                    onChange={e => setPath(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            {error && <div className="text-[12px] text-destructive">{error}</div>}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={busy || !repo.trim()}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Github className="w-3.5 h-3.5" /> Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm The Backup</DialogTitle>
              <DialogDescription>
                Review What Will Be Committed — Nothing Is Pushed Until You Confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-border bg-muted/30 divide-y divide-border font-mono text-[12px]">
              <div className="px-3 py-2 flex justify-between gap-2">
                <span className="text-muted-foreground">Repository</span>
                <span className="uppercase break-all">{preview.repo}</span>
              </div>
              <div className="px-3 py-2 flex justify-between gap-2">
                <span className="text-muted-foreground">Branch</span>
                <span>{preview.branch}</span>
              </div>
              <div className="px-3 py-2 flex justify-between gap-2">
                <span className="text-muted-foreground">Path</span>
                <span className="break-all">{preview.path}</span>
              </div>
              <div className="px-3 py-2 flex justify-between gap-2">
                <span className="text-muted-foreground">Templates</span>
                <span>{preview.template_count}</span>
              </div>
              <div className="px-3 py-2 flex justify-between gap-2">
                <span className="text-muted-foreground">Size</span>
                <span>{preview.size_bytes} Bytes</span>
              </div>
            </div>
            {error && <div className="text-[12px] text-destructive">{error}</div>}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setStep('form'); setError(null); }} disabled={busy}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={busy}>
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm Push
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Backup Complete</DialogTitle>
              <DialogDescription>
                {result.template_count} Templates Are Now Backed Up And Versioned On GitHub.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px]">
              <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="min-w-0 break-all">
                <span className="text-muted-foreground">Commit </span>
                {(result.commit || '').slice(0, 12)}
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-pink-400 hover:text-pink-300 uppercase"
                  >
                    View On GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}