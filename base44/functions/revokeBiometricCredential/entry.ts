import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveRp, requireFaceIdGate, faceIdGateError } from '../../shared/biometrics.ts';
import { writeSecurityEvent } from '../../shared/security.ts';

// Revokes a WebAuthn credential. Removing an Active credential requires a
// live Face ID assertion bound to this exact credential — verified
// server-side, never via a client flag. With zero Active credentials
// (nothing left to assert with) the authenticated owner session is the
// confirmation: Face ID is an added layer, never a lockout.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const credentialId = typeof body.credential_id === 'string' ? body.credential_id.trim() : '';
    if (!credentialId) return Response.json({ error: 'Missing credential_id' }, { status: 400 });

    // RLS-scoped read: a foreign credential id simply returns nothing.
    let creds = [];
    try {
      creds = await base44.entities.BiometricCredential.filter({ credential_id: credentialId });
    } catch (_) {}
    const cred = creds?.[0];
    if (!cred) return Response.json({ error: 'Credential Not Found.' }, { status: 404 });

    if (cred.status === 'Active') {
      const rp = resolveRp(req, body.rp_id);
      const gate = await requireFaceIdGate(
        base44, base44.asServiceRole, user, rp,
        `Revoke Face ID Credential ${cred.id}`, body.assertion
      );
      if (!gate.ok) {
        return Response.json({ error: faceIdGateError(gate.reason) }, { status: 403 });
      }
    }

    await base44.entities.BiometricCredential.update(cred.id, { status: 'Revoked' });

    await writeSecurityEvent(base44.asServiceRole, {
      eventType: 'faceid_credential_revoked',
      actorEmail: user.email,
      resourceType: 'BiometricCredential',
      resourceId: cred.id,
      outcome: 'success',
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Revocation Failed — Please Try Again.' }, { status: 500 });
  }
}