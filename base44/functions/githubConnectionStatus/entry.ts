import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { probeConnection } from '../../shared/connectionProbe.ts';

// Read-only status of the CALLER's own app-user GitHub connection.
// Returns safe metadata only (login) — never tokens, never a shared account.
// state: missing | connected | needs_reconnect | unknown.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const p = await probeConnection(base44, 'github', 10000);
  if (p.state === 'missing') return Response.json({ connected: false, state: 'missing' });
  return Response.json({ connected: p.reason !== 'lookup_failed', verified: p.state === 'connected', state: p.state, reason: p.reason || null, login: p.login || null });
}