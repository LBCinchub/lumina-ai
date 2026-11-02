import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { normalizeRepo } from '@/lib/githubRepo';
import GitHubSyncForm from '@/components/build/GitHubSyncForm';
import GitHubSyncReview from '@/components/build/GitHubSyncReview';
import GitHubSyncDone from '@/components/build/GitHubSyncDone';

const DEFAULT_PATH = 'index.html';
const failure = (err, fallback) => {
  const d = err?.response?.data || {};
  return { message: d.error || fallback, code: d.code || null };
};

// Sync the project's saved page to a repository through the user's own GitHub
// connection. The server previews exactly what will be committed; nothing is
// pushed until the user confirms that review. Mounted fresh for each opening.
export default function GitHubSyncDialog({ open, onOpenChange, project, onSynced }) {
  const [form, setForm] = useState(() => ({ repo: project.github_repo || '', branch: 'main', path: project.github_path || DEFAULT_PATH }));
  const [review, setReview] = useState(null); // { preview, token }
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const call = async (payload) => (await base44.functions.invoke('syncBuildProject', { project_id: project.id, ...payload })).data;
  const change = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(null); };

  const prepare = async () => {
    const norm = normalizeRepo(form.repo);
    if (!norm.ok) { setError({ message: norm.error }); return; }
    setBusy(true);
    setError(null);
    try {
      const data = await call({ repo: norm.repo, branch: form.branch.trim() || 'main', path: form.path.trim() || DEFAULT_PATH });
      setReview({ preview: data.preview, token: data.confirmation_token });
    } catch (err) {
      setError(failure(err, 'The Sync Could Not Be Prepared. Please Try Again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const { preview, token } = review;
    setBusy(true);
    setError(null);
    try {
      setResult(await call({ repo: preview.repo, branch: preview.branch, path: preview.path, confirmation_token: token }));
      onSynced?.();
    } catch (err) {
      setReview(null); // the review is single-use; prepare a fresh one
      setError(failure(err, 'The Sync Failed. Nothing Was Synced.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <GitHubSyncDone result={result} onClose={() => onOpenChange(false)} />
        ) : review ? (
          <GitHubSyncReview preview={review.preview} busy={busy} onBack={() => setReview(null)} onConfirm={confirm} />
        ) : (
          <GitHubSyncForm form={form} onChange={change} busy={busy} error={error} onCancel={() => onOpenChange(false)} onSubmit={prepare} />
        )}
      </DialogContent>
    </Dialog>
  );
}