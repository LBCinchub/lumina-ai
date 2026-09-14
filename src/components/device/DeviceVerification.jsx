import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useDeviceVerification } from '@/hooks/useDeviceVerification';

// Overlays for device verification: a one-time confirmation code when this
// browser enrolls as a new device, and an honest error banner with Retry if
// the check fails. Renders nothing once the device is verified.
export default function DeviceVerification() {
  const { state, confirmationCode, deviceName, error, retry, dismiss } = useDeviceVerification();

  return (
    <>
      <Dialog open={state === 'enrolled'} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Device Enrolled</DialogTitle>
            <DialogDescription>
              {deviceName || 'This Device'} Is Now Enrolled To Your LBC AI Account.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center rounded-xl border border-border bg-muted/30 py-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Confirmation Code
            </div>
            <div className="font-mono text-xl tracking-[0.25em] text-foreground">{confirmationCode}</div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            This Is Your App-Generated Device Key For This Browser. It Is Not Your Phone's Serial Number Or Any Hardware Information.
          </p>
          <p className="text-[12px] text-muted-foreground/80 leading-relaxed">
            If You Cleared Your Browser Data Or Switched Browsers, This Device Enrolls As A New One — That Is Expected.
          </p>
          <Button onClick={dismiss} className="w-full">Got It</Button>
        </DialogContent>
      </Dialog>

      {state === 'error' && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-sm rounded-xl border border-destructive/30 bg-card px-4 py-3 shadow-lg">
          <p className="text-[12px] text-destructive leading-relaxed">
            Device Verification Failed — {error}
          </p>
          <button
            onClick={retry}
            className="mt-2 text-[12px] font-medium text-foreground hover:text-pink-400 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}