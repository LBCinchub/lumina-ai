import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, ExternalLink } from 'lucide-react';
import ExportOption from '@/components/chat/ExportOption';

// Stays open until the user closes it, so every result stays visible:
// the downloaded file (which can also be opened from here), the share
// confirmation, or what went wrong.
export default function ExportDialog({ open, onOpenChange, title, messages, onDownload }) {
  const [pdf, setPdf] = useState(null); // { name, url }
  const [share, setShare] = useState('idle');
  const [error, setError] = useState('');

  const dropPdf = () => {
    if (pdf?.url) URL.revokeObjectURL(pdf.url);
    setPdf(null);
  };

  const handleOpenChange = (next) => {
    if (!next) { dropPdf(); setShare('idle'); setError(''); }
    onOpenChange(next);
  };

  const handleDownload = () => {
    setError('');
    dropPdf();
    try {
      setPdf(onDownload());
    } catch (_) {
      setError('The PDF Could Not Be Created, So Nothing Was Downloaded. Please Try Again.');
    }
  };

  const handleSendToHub = async () => {
    setShare('working');
    setError('');
    try {
      await base44.functions.invoke('shareToLbcHub', { title, messages });
      setShare('done');
    } catch (_) {
      setShare('idle');
      setError('Sharing To lbc-hub.com Failed, So Nothing Was Sent. Please Try Again.');
    }
  };

  const finished = !!pdf || share === 'done';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Export conversation</DialogTitle>
          <DialogDescription>
            Choose where you'd like to save this thread.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4" aria-live="polite">
          <ExportOption
            icon={Download}
            state={pdf ? 'done' : 'idle'}
            title={pdf ? 'PDF Download Started' : 'Download as PDF'}
            hint={pdf ? `${pdf.name} · Check Your Downloads` : 'Save to your device'}
            onClick={handleDownload}
          />
          {pdf && (
            <a
              href={pdf.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              Open The PDF In A New Tab
            </a>
          )}
          <ExportOption
            icon={Share2}
            state={share}
            disabled={share !== 'idle'}
            title={share === 'done' ? 'Sent to lbc-hub.com' : 'Send to lbc-hub.com'}
            hint={share === 'done' ? 'Conversation shared' : 'Share with your hub'}
            onClick={handleSendToHub}
          />
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={share === 'working'}>
            {finished ? 'Done' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}