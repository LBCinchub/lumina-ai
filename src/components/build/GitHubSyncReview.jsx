import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// The server's exact preview of the commit, confirmed before anything is pushed.
export default function GitHubSyncReview({ preview, busy, onBack, onConfirm }) {
  const rows = [
    ['Repository', preview.repo],
    ['Branch', preview.branch],
    ['Path', preview.path],
    ['Size', `${preview.size_bytes} Bytes`],
    ['Commit Message', preview.message],
    ['Content Hash', preview.content_hash],
  ];
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm The Sync</DialogTitle>
        <DialogDescription>Review What Will Be Committed. Nothing Is Pushed Until You Confirm.</DialogDescription>
      </DialogHeader>
      <dl className="rounded-md border border-border bg-muted/30 divide-y divide-border font-mono text-[12px]">
        {rows.map(([label, value]) => (
          <div key={label} className="px-3 py-2 flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="break-all text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Confirm Sync
        </Button>
      </DialogFooter>
    </>
  );
}