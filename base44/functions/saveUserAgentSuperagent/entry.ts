import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { encryptCredential } from '../../shared/userAgents.ts';
import { parseSuperagentAgentId, testSuperagentConnection } from '../../shared/superagentBridge.ts';

// Connects one of the user's LBC AI agents to their own Base44 Superagent
// (Bring Your Own Superagent). The Superagent holds the phone channels
// (Telegram, WhatsApp, iMessage) on the user's own Base44 account.
//
// Security model:
//  - The agent is resolved with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id returns nothing → 404.
//  - The connection is LIVE-TESTED against the real Superagent API before
//    anything is saved — honest pass/fail, never fake success.
//  - The API key is stored as AES-256-GCM ciphertext. The plaintext never
//    returns to the client and is never logged.
//  - The processing watermark starts at "now", so the bridge never replays
//    the Superagent's old conversation history.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const rawSuperagentId = typeof body.superagent_agent_id === 'string' ? body.superagent_agent_id : '';
    const apiKey = typeof body.api_key === 'string' ? body.api_key.trim() : '';

    if (!agentId || !rawSuperagentId || !apiKey) {
      return Response.json({ error: 'Missing agent, Superagent Agent ID, or API key' }, { status: 400 });
    }

    const superagentId = parseSuperagentAgentId(rawSuperagentId);
    if (!superagentId) {
      return Response.json(
        { error: 'That does not look like a Superagent Agent ID. Copy it exactly from its API URL in the Developer panel.' },
        { status: 400 }
      );
    }
    if (apiKey.length < 10 || apiKey.length > 200) {
      return Response.json(
        { error: 'That does not look like an API key. Copy it exactly from your Superagent\'s Developer panel.' },
        { status: 400 }
      );
    }

    // RLS-verified ownership — a foreign agent id filters to nothing.
    let agents = [];
    try {
      agents = await base44.entities.UserAgent.filter({ id: agentId });
    } catch (_) {}
    const agent = agents && agents[0];
    if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });

    // Live round-trip test BEFORE saving anything.
    let test;
    try {
      test = await testSuperagentConnection(superagentId, apiKey);
    } catch (err) {
      return Response.json({
        connected: false,
        reason: (err && err.message) || 'Your Superagent Is Unreachable — Check Your Base44 Account',
      });
    }

    const encrypted = await encryptCredential(apiKey);
    const nowIso = new Date().toISOString();
    const fields = {
      status: 'connected',
      superagent_agent_id: superagentId,
      api_key_encrypted: encrypted,
      connected_at: nowIso,
      last_processed_message_id: '',
      last_processed_at: nowIso, // Watermark: only messages after this are synced.
      last_mirror_at: '',
      reply_hour_key: '',
      reply_count: 0,
    };

    // Upsert — user-scoped, so RLS enforces ownership.
    let existing = [];
    try {
      existing = await base44.entities.UserAgentConnection.filter({ agent_id: agentId });
    } catch (_) {}
    if (existing && existing[0]) {
      await base44.entities.UserAgentConnection.update(existing[0].id, fields);
    } else {
      await base44.entities.UserAgentConnection.create({
        agent_id: agentId,
        owner_email: user.email,
        ownership_state: 'human_verified',
        ...fields,
      });
    }

    return Response.json({ connected: true, conversation_count: test.conversation_count });
  } catch (_) {
    // Never log the API key or request contents.
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}