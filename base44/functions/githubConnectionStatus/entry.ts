import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { GITHUB_CONNECTOR_ID } from '../../shared/security.ts';

// Read-only status of the CALLER's own app-user GitHub connection.
// Returns safe metadata only (login) — never tokens, never a shared account.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let token = null;
  try {
    const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GITHUB_CONNECTOR_ID);
    token = conn?.accessToken || null;
  } catch (_) {}
  if (!token) return Response.json({ connected: false });

  let login = null;
  let verified = false;
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) { login = String((await res.json())?.login || '').slice(0, 100) || null; verified = true; }
  } catch (_) {}
  return Response.json({ connected: true, verified, login });
}