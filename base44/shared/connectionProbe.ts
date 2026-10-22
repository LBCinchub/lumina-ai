// Read-only, current-user connection probes. A stored token alone is never
// "connected": the provider's own identity endpoint must accept it.
// States: missing | connected | needs_reconnect | unknown. Never starts OAuth.
import { GITHUB_CONNECTOR_ID } from './security.ts';
import { GMAIL_CONNECTOR_ID } from './autopilotActions.ts';

const PROBES: any = {
  github: { id: () => GITHUB_CONNECTOR_ID, url: 'https://api.github.com/user', accept: 'application/vnd.github+json', identity: (j: any) => j?.login },
  gmail: { id: () => GMAIL_CONNECTOR_ID, url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile', accept: 'application/json', identity: (j: any) => j?.emailAddress },
};

export async function probeConnection(base44: any, provider: 'github' | 'gmail', timeoutMs = 8000) {
  const p = PROBES[provider];
  let token = null;
  try {
    token = (await base44.asServiceRole.connectors.getCurrentAppUserConnection(p.id()))?.accessToken || null;
  } catch (_) {
    return { state: 'unknown', reason: 'lookup_failed' };
  }
  if (!token) return { state: 'missing' };
  try {
    const res = await fetch(p.url, { headers: { Authorization: `Bearer ${token}`, Accept: p.accept }, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 401) return { state: 'needs_reconnect', reason: 'unauthorized' };
    if (res.status === 403) return { state: 'needs_reconnect', reason: 'forbidden' };
    if (!res.ok) return { state: 'unknown', reason: `http_${res.status}` };
    const login = String(p.identity(await res.json().catch(() => ({}))) || '').slice(0, 100) || null;
    return { state: 'connected', verified: true, login };
  } catch (e) {
    return { state: 'unknown', reason: e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'timeout' : 'network' };
  }
}