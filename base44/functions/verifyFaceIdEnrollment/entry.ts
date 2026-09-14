import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveRp, verifyEnrollment, normalizeLabel } from '../../shared/biometrics.ts';
import { writeSecurityEvent } from '../../shared/security.ts';

// Completes Face ID enrollment: validates the attestation and the single-use
// challenge SERVER-SIDE, then stores only credential_id + public key +
// label. No biometric data, face data, or images ever reaches this code —
// the browser's WebAuthn API releases just the public key.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.registration) return Response.json({ error: 'Missing Registration Result' }, { status: 400 });

    const rp = resolveRp(req, body.rp_id);
    if (!rp) {
      return Response.json({ error: 'Face ID Not Available On This Browser Or Device' }, { status: 400 });
    }

    const result = await verifyEnrollment(base44.asServiceRole, user, rp, body.registration);
    if (!result.ok) {
      await writeSecurityEvent(base44.asServiceRole, {
        eventType: 'faceid_enrollment',
        actorEmail: user.email,
        resourceType: 'BiometricCredential',
        resourceId: null,
        outcome: 'failed',
        metadata: result.error,
      });
      return Response.json({ error: 'Face ID Enrollment Failed — Please Try Again.' }, { status: 400 });
    }

    // RLS-scoped read: a duplicate credential id is simply not found.
    let existing = [];
    try {
      existing = await base44.entities.BiometricCredential.filter({
        credential_id: result.credential.credentialId,
      });
    } catch (_) {}
    if (existing?.length) {
      return Response.json({ error: 'This Device Is Already Enrolled.' }, { status: 409 });
    }

    // User-scoped create — RLS stamps ownership server-side.
    const created = await base44.entities.BiometricCredential.create({
      credential_id: result.credential.credentialId,
      public_key: result.credential.publicKeyB64,
      sign_count: result.credential.counter,
      label: normalizeLabel(body.label),
      status: 'Active',
      last_used: new Date().toISOString().slice(0, 10),
    });

    await writeSecurityEvent(base44.asServiceRole, {
      eventType: 'faceid_enrollment',
      actorEmail: user.email,
      resourceType: 'BiometricCredential',
      resourceId: created.id,
      outcome: 'success',
    });

    return Response.json({ credential: { id: created.id, label: created.label } });
  } catch (error) {
    return Response.json({ error: 'Face ID Enrollment Failed — Please Try Again.' }, { status: 500 });
  }
}