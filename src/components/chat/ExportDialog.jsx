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
import { Download, Share2, Loader2 } from 'lucide-react';

export default function ExportDialog({ open, onOpenChange, title, messages, onDownload }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleDownload = () => {
    onDownload();
    onOpenChange(false);
  };

  const handleSendToHub = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('shareToLbcHub', {
        title,
        messages
      });
      setSent(true);
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
      }, 2000);
    } catch (err) {
      console.error('Error sharing to lbc-hub:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Export conversation</DialogTitle>
          <DialogDescription>
            Choose where you'd like to save this thread.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
          >
            <Download className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <div className="text-sm font-medium text-foreground">Download as PDF</div>
              <div className="text-xs text-muted-foreground">Save to your device</div>
            </div>
          </button>

          <button
            onClick={handleSendToHub}
            disabled={sending || sent}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-accent transition-colors text-left disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            )}
            <div>
              <div className="text-sm font-medium text-foreground">
                {sent ? '✓ Sent to lbc-hub.com' : 'Send to lbc-hub.com'}
              </div>
              <div className="text-xs text-muted-foreground">
                {sent ? 'Conversation shared' : 'Share with your hub'}
              </div>
            </div>
          </button>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}