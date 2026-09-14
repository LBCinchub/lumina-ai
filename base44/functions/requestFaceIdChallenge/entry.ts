import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  resolveRp,
  issueAssertionChallenge,
  buildAuthenticationOptions,
  listActiveCredentials,
} from '../../shared/biometrics.ts';

// Requests an assertion challenge for a sensitive action. The challenge is
// single-use, expires in 5 minutes, and is bound server-side to the current
// user AND the exact action being confirmed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!action || action.length > 200) {
      return Response.json({ error: 'Missing Or Invalid Action' }, { status: 400 });
    }

    const rp = resolveRp(req, body.rp_id);
    if (!rp) {
      return Response.json({ error: 'Face ID Not Available On This Browser Or Device' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const challenge = await issueAssertionChallenge(db, user, action);
    const allowCredentials = (await listActiveCredentials(base44)).map(c => ({
      type: 'public-key',
      id: c.credential_id,
      transports: ['internal'],
    }));
    const options = buildAuthenticationOptions(rp, challenge, allowCredentials);
    return Response.json({ options });
  } catch (error) {
    return Response.json({ error: 'Face ID Challenge Failed — Please Try Again.' }, { status: 500 });
  }
}