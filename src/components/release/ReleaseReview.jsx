import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ReleaseReview({ preview, busy, onConfirm, onCancel }) {
  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3 text-sm">
      <div className="text-slate-300">Open a pull request into <span className="font-mono">{preview.repo}:{preview.base}</span></div>
      <div className="text-slate-200 font-medium">{preview.title}</div>
      <ul className="text-xs font-mono text-slate-400 space-y-1">
        {preview.files.map(f => <li key={f.path}>{f.path} · {f.size_bytes} bytes</li>)}
      </ul>
      <div className="text-xs text-slate-500">Content hash {preview.content_hash}. Approval expires in 5 minutes and works once.</div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={onConfirm} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white disabled:opacity-40">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Approve And Open Pull Request
        </button>
        <button disabled={busy} onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300">Cancel</button>
      </div>
    </div>
  );
}