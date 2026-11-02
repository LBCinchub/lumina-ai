import React from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Verified result of a sync: the commit GitHub returned.
export default function GitHubSyncDone({ result, onClose }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Synced To GitHub</DialogTitle>
        <DialogDescription>{result.path} Is Committed To {result.repo} On {result.branch}.</DialogDescription>
      </DialogHeader>
      <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2.5 font-mono text-[12px]">
        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="min-w-0 break-all">
          <span className="text-muted-foreground">Commit </span>
          {String(result.commit || '').slice(0, 12)}
          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-primary hover:underline">
              View On GitHub <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}