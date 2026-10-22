import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GitPullRequest, Loader2 } from 'lucide-react';
import ReleaseReview from '@/components/release/ReleaseReview';

const field = 'w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

export default function ReleasePanel() {
  const [form, setForm] = useState({ repo: 'LBCinchub/lumina-ai', base: 'main', title: '', description: '', path: '', content: '' });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setPreview(null); };

  const send = async (token) => {
    setBusy(true); setError(null);
    try {
      const { path, content, ...rest } = form;
      const res = await base44.functions.invoke('githubRelease', { ...rest, files: [{ path, content }], confirmation_token: token });
      if (token) { setResult(res.data.pull_request); setPreview(null); } else setPreview(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Release failed');
      if (token) setPreview(null);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
      <h2 className="text-lg font-medium flex items-center gap-2"><GitPullRequest className="w-4 h-4 text-slate-500" /> Governed Release</h2>
      <p className="text-xs text-slate-500">Changes go to a new release branch and open a pull request. Nothing is pushed to the base branch; you merge in GitHub after review.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <input className={field} aria-label="Repository" value={form.repo} onChange={set('repo')} />
        <input className={field} aria-label="Base Branch" value={form.base} onChange={set('base')} />
      </div>
      <input className={field} placeholder="Pull Request Title" value={form.title} onChange={set('title')} />
      <textarea className={`${field} h-16`} placeholder="Description (Optional)" value={form.description} onChange={set('description')} />
      <input className={field} placeholder="File Path, e.g. src/config.js" value={form.path} onChange={set('path')} />
      <textarea className={`${field} h-40 font-mono`} placeholder="Full File Content" value={form.content} onChange={set('content')} />
      {error && <div role="alert" className="text-sm text-red-400">{error}</div>}
      {result && <div className="text-sm text-emerald-400">Pull request #{result.number} opened. <a href={result.url} target="_blank" rel="noreferrer" className="underline">Review in GitHub</a></div>}
      {preview
        ? <ReleaseReview preview={preview.preview} busy={busy} onConfirm={() => send(preview.confirmation_token)} onCancel={() => setPreview(null)} />
        : <button disabled={busy || !form.title.trim() || !form.path.trim() || !form.content} onClick={() => send(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm disabled:opacity-40">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Preview Release
          </button>}
    </div>
  );
}