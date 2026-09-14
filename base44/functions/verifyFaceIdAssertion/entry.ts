import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveRp, verifyAssertion } from '../../shared/biometrics.ts';
import { writeSecurityEvent } from '../../shared/security.ts';

// Verifies a Face ID assertion entirely SERVER-SIDE: the single-use
// action-bound challenge, the signature against the stored public key, the
// origin, the RP ID, and the sign counter. Sensitive actions execute only
// on verified === true — a client-side verified flag is never trusted.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const rp = resolveRp(req, body.rp_id);

    const result = await verifyAssertion(
      base44, base44.asServiceRole, user, rp, action, body.assertion
    );

    await writeSecurityEvent(base44.asServiceRole, {
      eventType: 'faceid_assertion',
      actorEmail: user.email,
      resourceType: 'BiometricAction',
      resourceId: action.slice(0, 100),
      outcome: result.verified ? 'success' : 'failed',
      metadata: result.verified ? null : result.error,
    });

    return Response.json({
      verified: !!result.verified,
      error: result.verified ? null : result.error,
    });
  } catch (error) {
    return Response.json({ error: 'Face ID Verification Failed — Please Try Again.' }, { status: 500 });
  }
}