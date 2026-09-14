import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  isFaceIdSupported,
  toAuthenticationCredentialOptions,
  serializeAssertion,
} from '@/lib/webauthn';
import { Fingerprint, Loader2, ShieldOff, XCircle } from 'lucide-react';

// Reusable "Confirm With Face ID" dialog for sensitive actions.
//
// The dialog runs the browser's standard platform-authenticator flow and
// hands the raw assertion to the caller — the SERVER verifies it against the
// stored public key; this component never fakes success. Honest states only:
//  - Unsupported browser/device → "Face ID Not Available On This Browser Or
//    Device" (standard login still works).
//  - Bad assertion → "Verification Failed — Try Again".
//  - No active credentials → standard session confirmation, never a lockout.
//
// onVerified(assertion | null) → Promise<boolean>: receives the serialized
// assertion (or null when Face ID isn't enrolled), performs the sensitive
// action server-side, and resolves true only when it actually succeeded.
export default function FaceIdConfirmDialog({
  open,
  onOpenChange,
  action,
  title = 'Confirm With Face ID',
  description,
  confirmLabel = 'Confirm',
  onVerified,
}) {
  // checking | ready | prompting | verifying | unsupported | not_enrolled | failed
  const [state, setState] = useState('checking');
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    setState('checking');
    let alive = true;
    (async () => {
      let active = 0;
      try {
        const creds = await base44.entities.BiometricCredential.list('-created_date', 100);
        active = creds.filter((c) => c.status === 'Active').length;
      } catch (_) {}
      if (!alive) return;
      setActiveCount(active);
      if (active === 0) {
        setState('not_enrolled');
        return;
      }
      const supported = await isFaceIdSupported();
      if (!alive) return;
      setState(supported ? 'ready' : 'unsupported');
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const runFaceId = useCallback(async () => {
    setState('prompting');
    try {
      const res = await base44.functions.invoke('requestFaceIdChallenge', {
        action,
        rp_id: window.location.hostname,
      });
      const options = res?.data?.options || res?.options;
      if (!options?.challenge) throw new Error('No Challenge');
      const credential = await navigator.credentials.get(
        toAuthenticationCredentialOptions(options)
      );
      if (!credential) {
        // User dismissed the browser prompt — back to Ready, no fake failure.
        setState('ready');
        return;
      }
      setState('verifying');
      const ok = await onVerified(serializeAssertion(credential));
      if (ok) {
        onOpenChange(false);
      } else {
        setState('failed');
      }
    } catch (_) {
      setState('ready');
    }
  }, [action, onVerified, onOpenChange]);

  const confirmStandard = useCallback(async () => {
    setState('verifying');
    const ok = await onVerified(null);
    if (ok) {
      onOpenChange(false);
    } else {
      setState('failed');
    }
  }, [onVerified, onOpenChange]);

  const busy = state === 'prompting' || state === 'verifying';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-lg tracking-tight">
            <Fingerprint className="w-4 h-4 text-pink-400" strokeWidth={1.75} />
            {title}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-6 text-[12px] leading-relaxed text-muted-foreground">
          {state === 'checking' && (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
              Checking Face ID…
            </span>
          )}
          {state === 'unsupported' && (
            <span className="flex items-start gap-2 text-destructive">
              <ShieldOff className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
              Face ID Not Available On This Browser Or Device. Standard Login Still
              Works — You Can Confirm This Action From A Device With Face ID.
            </span>
          )}
          {state === 'not_enrolled' && (
            <span>
              Face ID Is Not Set Up On Your Account. Your Standard Session Will Be
              Used As Confirmation.
            </span>
          )}
          {state === 'failed' && (
            <span className="flex items-start gap-2 text-destructive">
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
              Verification Failed — Try Again.
            </span>
          )}
          {busy && (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
              {state === 'prompting' ? 'Waiting For Face ID…' : 'Verifying…'}
            </span>
          )}
          {state === 'ready' && activeCount > 0 && (
            <span>
              Confirm This Action With Face ID On This Device.
            </span>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {state === 'ready' && (
            <Button size="sm" onClick={runFaceId}>
              <Fingerprint className="w-3.5 h-3.5" strokeWidth={1.75} />
              {confirmLabel} With Face ID
            </Button>
          )}
          {state === 'not_enrolled' && (
            <Button size="sm" onClick={confirmStandard}>
              {confirmLabel} With Standard Session
            </Button>
          )}
          {state === 'failed' && (
            <Button size="sm" onClick={runFaceId}>
              <Fingerprint className="w-3.5 h-3.5" strokeWidth={1.75} />
              Try Face ID Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}