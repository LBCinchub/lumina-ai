import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const KINDS = [
  { value: 'strategic_summary', label: 'Strategic Summary' },
  { value: 'report', label: 'Report' },
  { value: 'brief', label: 'Brief' },
  { value: 'memo', label: 'Memo' },
];

// Document Generation — draft strategic summaries and reports directly from
// the open conversation. Superagent tier (enforced server-side).
export default function DocumentDialog({ open, onOpenChange, conversationId, messages }) {
  const [kind, setKind] = useState('strategic_summary');
  const [instructions, setInstructions] = useState('');
  const [state, setState] = useState('form'); // form | generating | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setState('form');
      setResult(null);
      setError('');
      setCopied(false);
      setInstructions('');
    }
  }, [open]);

  const handleGenerate = async () => {
    setState('generating');
    setError('');
    try {
      const res = await base44.functions.invoke('generateDocument', {
        conversation_id: conversationId,
        kind,
        instructions,
      });
      const data = res?.data || res || {};
      if (!data?.content) throw new Error('empty');
      setResult(data);
      setState('done');
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.data?.error || err?.error;
      setError(serverError || 'The Draft Could Not Be Generated — Please Try Again.');
      setState('form');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'LBC-AI-Document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasContent = conversationId && messages && messages.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Draft Document
          </DialogTitle>
        </DialogHeader>

        {state === 'form' && (
          <div className="space-y-4 overflow-y-auto scrollbar-minimal px-1">
            {!hasContent ? (
              <p className="text-[13px] text-muted-foreground">
                Open A Conversation With Content First — Drafts Are Built From Your Conversation Context.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {KINDS.map(k => (
                      <button
                        key={k.value}
                        onClick={() => setKind(k.value)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs transition-colors',
                          kind === k.value
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-instructions">Direction (Optional)</Label>
                  <Textarea
                    id="doc-instructions"
                    rows={3}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="e.g. Focus On The Expansion Decision, Keep It Under One Page…"
                  />
                </div>
                {error && <p className="text-[12px] text-destructive">{error}</p>}
                <Button onClick={handleGenerate} className="w-full sm:w-auto">
                  <FileText className="h-4 w-4" /> Generate Draft
                </Button>
              </>
            )}
          </div>
        )}

        {state === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <p className="text-[13px] text-muted-foreground">Drafting From Your Conversation…</p>
          </div>
        )}

        {state === 'done' && result && (
          <div className="space-y-3 overflow-y-auto scrollbar-minimal px-1">
            <p className="text-[11px] text-muted-foreground">
              Saved To Your Knowledge Documents.
            </p>
            <div className="rounded-lg border border-border bg-card p-4 max-h-[45vh] overflow-y-auto scrollbar-minimal">
              <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed font-sans">{result.content}</pre>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}