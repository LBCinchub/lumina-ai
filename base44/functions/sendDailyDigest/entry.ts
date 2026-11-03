import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { sendDigest } from '../../shared/dailyDigest.ts';

// Daily Email Digest workflow target. A workflow step runs as its creator (an
// app admin): that person's own pending Action Requests and new insights go
// from their own connected Gmail to that same mailbox. The URL is public, so
// only an authenticated admin session may run it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { timezone } = await req.json().catch(() => ({}));
    const result = await sendDigest(base44, base44.asServiceRole, user, { timezone });
    return Response.json({ ok: result.state === 'sent', state: result.state });
  } catch (_) {
    return Response.json({ ok: false, error: 'The Digest Could Not Be Sent' }, { status: 500 });
  }
}