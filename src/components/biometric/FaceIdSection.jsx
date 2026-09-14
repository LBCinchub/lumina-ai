import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import FaceIdConfirmDialog from '@/components/biometric/FaceIdConfirmDialog';
import FaceIdEnrollmentDialog from '@/components/biometric/FaceIdEnrollmentDialog';
import { isFaceIdSupported } from '@/lib/webauthn';
import { Loader2, Fingerprint, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

// Face ID Verification section of Settings. The browser's standard WebAuthn
// API runs the Face ID / Touch ID flow — biometric data never leaves the
// device; only the public key is stored. Reads are RLS-scoped to this
// account; every write (enroll + revoke) goes through the backend functions.
export default function FaceIdSection() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await base44.entities.BiometricCredential.list('-created_date', 50);
      setCredentials(data);
    } catch (_) {
      setError('Could Not Load Your Face ID Credentials — Please Try Again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    isFaceIdSupported().then(setSupported);
  }, [load]);

  const active = credentials.filter((c) => c.status === 'Active');

  const confirmRemove = async (assertion) => {
    if (!pendingRemove) return false;
    try {
      const res = await base44.functions.invoke('revokeBiometricCredential', {
        credential_id: pendingRemove.credential_id,
        assertion,
        rp_id: window.location.hostname,
      });
      const data = res?.data || res || {};
      if (data.error) {
        setError(data.error);
        return false;
      }
      await load();
      return true;
    } catch (err) {
      const serverError = err?.response?.data?.error || err?.data?.error;
      setError(serverError || 'Removal Failed — Please Try Again.');
      return false;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Fingerprint className="w-4 h-4 text-pink-400" strokeWidth={1.75} />
          <h2 className="text-sm font-medium">Face ID Verification</h2>
          {active.length > 0 ? (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Active
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
              Not Set Up
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
        </button>
      </div>

      <div className="px-4 md:px-5 py-4 space-y-4">
        {error && (
          <div className="text-[12px] text-destructive">{error}</div>
        )}
        {supported === false && (
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            Face ID Not Available On This Browser Or Device — Standard Login Still Works.
          </div>
        )}
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Confirm Sensitive Actions With Face ID Or Touch ID. Your Face Or
          Fingerprint Never Leaves Your Device — Only A Public Key Is Stored.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setEnrollOpen(true)} className="text-[12px]">
            <Fingerprint className="w-3.5 h-3.5" strokeWidth={1.75} />
            Set Up Face ID
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border border-t border-border">
        {loading ? (
          <div className="px-4 md:px-5 py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" strokeWidth={1.75} />
          </div>
        ) : credentials.length === 0 ? (
          <div className="px-4 md:px-5 py-8 text-center text-[12px] text-muted-foreground">
            No Face ID Credentials Enrolled Yet — Everything Works With Standard Login.
          </div>
        ) : (
          credentials.map((c) => (
            <div key={c.id} className="px-4 md:px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium truncate">{c.label || 'My Device'}</span>
                  {c.status === 'Active' ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                      <XCircle className="w-3 h-3" strokeWidth={2} /> Revoked
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Last Used {c.last_used || '—'}
                </div>
              </div>
              {c.status === 'Active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingRemove(c)}
                  className="text-[12px]"
                >
                  Remove
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <FaceIdConfirmDialog
        open={!!pendingRemove}
        onOpenChange={(o) => { if (!o) setPendingRemove(null); }}
        action={pendingRemove ? `Revoke Face ID Credential ${pendingRemove.id}` : ''}
        title="Remove Face ID Credential"
        description={
          pendingRemove
            ? `Remove The Face ID Credential "${pendingRemove.label || 'My Device'}" From Your Account?`
            : ''
        }
        confirmLabel="Remove"
        onVerified={confirmRemove}
      />

      <FaceIdEnrollmentDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onComplete={load}
      />
    </div>
  );
}