import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { decryptCredential } from '../../shared/userAgents.ts';
import { testSuperagentConnection } from '../../shared/superagentBridge.ts';

// Re-tests a saved Superagent connection with a live round trip: the test
// message is posted to the Superagent's default conversation and its reply
// is delivered to the user's connected phone channel. Honest pass/fail only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    if (!agentId) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

    // User-scoped read — RLS verifies ownership.
    let conns = [];
    try {
      conns = await base44.entities.UserAgentConnection.filter({ agent_id: agentId });
    } catch (_) {}
    const conn = (conns || []).find(c => c && c.status === 'connected' && c.superagent_agent_id && c.api_key_encrypted);
    if (!conn) {
      return Response.json({ sent: false, reason: 'Not Connected Yet — Paste Your Superagent Details Above.' });
    }

    let apiKey = '';
    try {
      apiKey = await decryptCredential(conn.api_key_encrypted);
    } catch (_) {
      return Response.json({ sent: false, reason: 'The stored connection could not be read. Reconnect your Superagent.' });
    }

    try {
      const test = await testSuperagentConnection(conn.superagent_agent_id, apiKey);
      return Response.json({ sent: true, conversation_count: test.conversation_count });
    } catch (err) {
      return Response.json({
        sent: false,
        reason: (err && err.message) || 'Your Superagent Is Unreachable — Check Your Base44 Account',
      });
    }
  } catch (_) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}