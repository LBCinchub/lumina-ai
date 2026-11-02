import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TwinAuthForm from '@/components/twin/TwinAuthForm';

export default function TwinSettingsModal({ open, onOpenChange, settings, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Twin Authorization</DialogTitle>
          <DialogDescription>
            Control what your Twin can do on your behalf. Financial actions always require explicit confirmation regardless of these settings.
          </DialogDescription>
        </DialogHeader>
        <TwinAuthForm
          settings={settings}
          onCancel={() => onOpenChange(false)}
          onSaved={() => { onSaved?.(); onOpenChange(false); }}
        />
      </DialogContent>
    </Dialog>
  );
}