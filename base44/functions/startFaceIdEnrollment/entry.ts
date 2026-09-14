import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  resolveRp,
  issueEnrollmentChallenge,
  buildRegistrationOptions,
  listActiveCredentials,
} from '../../shared/biometrics.ts';

// Starts Face ID enrollment: issues a single-use, user-bound challenge
// (max one active per user, 5-minute expiry) and returns WebAuthn
// registration options for platform authenticators. The browser's Face ID /
// Touch ID never sends biometric data — only a public key.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rp = resolveRp(req, body.rp_id);
    if (!rp) {
      return Response.json({ error: 'Face ID Not Available On This Browser Or Device' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const challenge = await issueEnrollmentChallenge(db, user);
    const excludeCredentials = (await listActiveCredentials(base44)).map(c => ({
      id: c.credential_id,
      transports: ['internal'],
    }));
    const options = buildRegistrationOptions(user, rp, challenge, excludeCredentials);
    return Response.json({ options });
  } catch (error) {
    return Response.json({ error: 'Face ID Setup Failed — Please Try Again.' }, { status: 500 });
  }
}