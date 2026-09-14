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
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import {
  isFaceIdSupported,
  toRegistrationCredentialOptions,
  serializeRegistration,
} from '@/lib/webauthn';
import { Fingerprint, Loader2, CheckCircle2, XCircle, ShieldOff } from 'lucide-react';

// Guided Face ID enrollment — step by step, in the LBC AI theme.
//  1. Introduction — what Face ID protects and what is (never) stored.
//  2. Name This Device — a short label shown in Settings.
//  3. Enroll — the device's Face ID / Touch ID prompt, then server-side
//     verification of the attestation before anything is stored.
//  4. Success — confirmed only after the server verified the enrollment.
// Honest states only: unsupported browsers get a plain message, a dismissed
// prompt is not a failure, and errors offer a retry. Biometric data never
// leaves the device — only the public key is stored.

const INTRO_POINTS = [
  'Confirm Sensitive Actions Like Device Revocation And Agent Archival',
  'Your Face Or Fingerprint Never Leaves Your Device — Only A Public Key Is Stored',
  'Face ID Is An Added Layer — Standard Login Always Works',
];

function MarkBadge({ children, tone = 'pink' }) {
  if (tone === 'success') {
    return (
      <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
        {children}
      </div>
    );
  }
  return (
    <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
      {children}
    </div>
  );
}

export default function FaceIdEnrollmentDialog({ open, onOpenChange, onComplete }) {
  // intro | label | enroll | success | unsupported
  const [step, setStep] = useState('intro');
  // enroll step: idle | waiting | verifying
  const [phase, setPhase] = useState('idle');
  const [label, setLabel] = useState('');
  const [error, setError] = useState(null);
  const [enrolledLabel, setEnrolledLabel] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('intro');
    setPhase('idle');
    setLabel('');
    setError(null);
    setEnrolledLabel('');
    let alive = true;
    isFaceIdSupported().then((ok) => {
      if (alive && !ok) setStep('unsupported');
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const enroll = useCallback(async () => {
    setError(null);
    setPhase('waiting');
    try {
      const startRes = await base44.functions.invoke('startFaceIdEnrollment', {
        rp_id: window.location.hostname,
      });
      const options = startRes?.data?.options || startRes?.options;
      if (!options?.challenge) throw new Error('No Challenge');
      const credential = await navigator.credentials.create(
        toRegistrationCredentialOptions(options)
      );
      if (!credential) {
        // Prompt dismissed — back to Ready, never a fake failure.
        setPhase('idle');
        return;
      }
      setPhase('verifying');
      const verifyRes = await base44.functions.invoke('verifyFaceIdEnrollment', {
        registration: serializeRegistration(credential),
        label: label.trim() || 'My Device',
        rp_id: window.location.hostname,
      });
      const data = verifyRes?.data || verifyRes || {};
      if (data.error) {
        setError(data.error);
        setPhase('idle');
      } else {
        setEnrolledLabel(data.credential?.label || label.trim() || 'My Device');
        setStep('success');
      }
    } catch (err) {
      // A dismissed browser prompt is not a failure — everything else is.
      if (err?.name === 'NotAllowedError') {
        setPhase('idle');
        return;
      }
      const serverError = err?.response?.data?.error || err?.data?.error;
      setError(serverError || 'Face ID Setup Failed — Please Try Again.');
      setPhase('idle');
    }
  }, [label]);

  const busy = phase === 'waiting' || phase === 'verifying';
  const close = () => {
    if (!busy) onOpenChange(false);
  };
  const finish = () => {
    onOpenChange(false);
    if (onComplete) onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-md">
        {step === 'intro' && (
          <>
            <div className="pt-2 text-center">
              <MarkBadge>
                <Fingerprint className="w-7 h-7 text-white" strokeWidth={1.75} />
              </MarkBadge>
            </div>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="font-serif text-lg tracking-tight">
                Set Up Face ID
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                Add An Extra Layer Of Confirmation For Your Most Sensitive
                Actions — Verified Entirely On Your Device.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2.5 py-1">
              {INTRO_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-pink-400" strokeWidth={2} />
                  {point}
                </li>
              ))}
            </ul>
            <DialogFooter className="sm:justify-center">
              <Button size="sm" onClick={() => setStep('label')}>
                Get Started
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'label' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg tracking-tight">
                Name This Device
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                Give This Face ID Credential A Short Label So You Can
                Recognize It Later — For Example, The Phone Or Laptop You Are
                Using Right Now.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. iPhone"
              maxLength={40}
              autoFocus
              className="text-sm"
            />
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('intro')}>
                Back
              </Button>
              <Button size="sm" onClick={() => { setStep('enroll'); enroll(); }}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'enroll' && (
          <>
            <div className="pt-2 text-center">
              <MarkBadge>
                {busy ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" strokeWidth={1.75} />
                ) : (
                  <Fingerprint className="w-7 h-7 text-white" strokeWidth={1.75} />
                )}
              </MarkBadge>
            </div>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="font-serif text-lg tracking-tight">
                {phase === 'verifying' ? 'Verifying…' : 'Confirm With Your Device'}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {phase === 'waiting' && 'Waiting For Your Device\u2019s Face ID Or Touch ID Prompt…'}
                {phase === 'verifying' && 'Checking The Enrollment On The Server…'}
                {phase === 'idle' && 'Follow Your Device\u2019s Face ID Prompt To Finish Setting It Up.'}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="text-[12px] text-destructive flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
                {error}
              </div>
            )}
            <DialogFooter className="sm:justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={close} disabled={busy}>
                Cancel
              </Button>
              {phase === 'idle' && (
                <Button size="sm" onClick={enroll}>
                  Open Face ID Prompt
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="pt-2 text-center">
              <MarkBadge tone="success">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" strokeWidth={1.75} />
              </MarkBadge>
            </div>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="font-serif text-lg tracking-tight">
                Face ID Is Now Active
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                The Credential &ldquo;{enrolledLabel}&rdquo; Can Now Confirm Your
                Sensitive Actions. You Can Remove It Any Time From Face ID
                Verification In Settings.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button size="sm" onClick={finish}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'unsupported' && (
          <>
            <div className="pt-2 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <ShieldOff className="w-7 h-7 text-muted-foreground" strokeWidth={1.75} />
              </div>
            </div>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle className="font-serif text-lg tracking-tight">
                Face ID Not Available
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                Face ID Not Available On This Browser Or Device — Standard
                Login Still Works. You Can Set It Up Later From A Device With
                Face ID Or Touch ID.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button variant="ghost" size="sm" onClick={close}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}