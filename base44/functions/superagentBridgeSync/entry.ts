import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  runAgentTurn,
  decryptCredential,
  MAX_HISTORY_MESSAGES,
} from '../../shared/userAgents.ts';
import {
  collectNewUserMessages,
  sendSuperagentMessage,
  withinDeliveryBudget,
  deliveryBudgetUpdate,
  SuperagentError,
  MAX_DELIVERY_CHARS,
} from '../../shared/superagentBridge.ts';

// Superagent Bridge sync. For every agent connected to the user's own
// Base44 Superagent: fetches the Superagent's conversations, detects new
// user-role messages since the stored watermark, runs the user's LBC AI
// agent on them (same persona + voice + instructions + knowledge flow),
// persists both sides in the agent's chat history, and delivers the reply
// through the Superagent API — which lands on the user's phone channel.
//
// Modes:
//  - { agent_id } → manual "Sync Now" (user session; RLS + 404 enforce that
//    only the owning user's connection is processed).
//  - {} → scheduled run (every-minute workflow; service role; every
//    connection must carry the SAME server-stamped owner as its agent).
//
// Security model:
//  - In manual mode all reads/writes are user-scoped — RLS isolation.
//  - In scheduled mode the connection and agent must match on
//    server-stamped owner_email, and both must be human_verified-usable.
//  - The API key is decrypted in-memory only, never logged, never returned.
//  - The Superagent's payloads are treated as untrusted message content.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const manualAgentId = typeof body.agent_id === 'string' ? body.agent_id : '';

    if (manualAgentId) {
      // ---- Manual Sync Now ----
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

      let agents = [];
      try {
        agents = await base44.entities.UserAgent.filter({ id: manualAgentId });
      } catch (_) {}
      const agent = agents && agents[0];
      if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });

      let conns = [];
      try {
        conns = await base44.entities.UserAgentConnection.filter({ agent_id: manualAgentId });
      } catch (_) {}
      const conn = (conns || []).find(
        c => c && c.status === 'connected' && c.superagent_agent_id && c.api_key_encrypted
      );
      if (!conn) {
        return Response.json({ ok: true, processed: 0, replied: 0, failed: 0, note: 'Not Connected' });
      }

      let result;
      try {
        result = await processConnection(base44, conn, agent);
      } catch (err) {
        return Response.json({
          ok: true,
          processed: 0,
          replied: 0,
          failed: 1,
          note: (err && err.message) || 'Your Superagent Is Unreachable — Check Your Base44 Account',
        });
      }
      return Response.json({ ok: true, ...result });
    }

    // ---- Scheduled run (workflow) ----
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = base44.asServiceRole;
    const conns = await service.entities.UserAgentConnection.filter(
      { status: 'connected' }, 'created_date', 50
    ).catch(() => []);

    let processed = 0;
    let replied = 0;
    let failed = 0;
    let syncs = 0;

    for (const conn of conns || []) {
      if (!conn.superagent_agent_id || !conn.api_key_encrypted || !conn.owner_email) continue;

      let agents = [];
      try {
        agents = await service.entities.UserAgent.filter({ id: conn.agent_id });
      } catch (_) {}
      const agent = agents && agents[0];

      // Ownership verification: the connection and the agent must carry the
      // same server-stamped owner. Never process a mismatched pair.
      if (!agent || agent.owner_email !== conn.owner_email || agent.status === 'archived') continue;

      try {
        const r = await processConnection(service, conn, agent);
        processed += r.processed;
        replied += r.replied;
        failed += r.failed;
        syncs++;
      } catch (_) {
        failed++;
      }
    }

    return Response.json({ ok: true, connections: syncs, processed, replied, failed });
  } catch (_) {
    return Response.json({ ok: false }, { status: 500 });
  }
}

// Processes one connection. `client` is scoped to the connection owner
// (user-scoped in manual mode, service role after ownership verification in
// scheduled mode).
async function processConnection(client, conn, agent) {
  const ownerEmail = conn.owner_email;
  let apiKey = '';
  try {
    apiKey = await decryptCredential(conn.api_key_encrypted);
  } catch (_) {
    throw new SuperagentError('The stored connection could not be read. Reconnect your Superagent.');
  }

  const entries = await collectNewUserMessages(conn.superagent_agent_id, apiKey, conn.last_processed_at);

  let processed = 0;
  let replied = 0;
  let failed = 0;

  for (const entry of entries) {
    // History BEFORE this turn's message — same flow as the in-app chat.
    const history = await client.entities.UserAgentMessage.filter(
      { agent_id: agent.id }, 'created_date', MAX_HISTORY_MESSAGES
    ).catch(() => []);

    // Persist the inbound phone message with the connection's stamped owner.
    await client.entities.UserAgentMessage.create({
      agent_id: agent.id,
      role: 'user',
      content: entry.text,
      owner_email: ownerEmail,
      ownership_state: 'human_verified',
    }).catch(() => {});

    let reply = '';
    try {
      reply = await runAgentTurn(client, agent, { history, userMessage: entry.text });
    } catch (_) {
      reply = '';
    }

    if (reply) {
      await client.entities.UserAgentMessage.create({
        agent_id: agent.id,
        role: 'assistant',
        content: reply,
        owner_email: ownerEmail,
        ownership_state: 'human_verified',
      }).catch(() => {});

      // Deliver the reply into the conversation the phone message came from.
      if (withinDeliveryBudget(conn)) {
        try {
          await sendSuperagentMessage(
            conn.superagent_agent_id, apiKey, entry.conversation_id, 'assistant', reply.slice(0, MAX_DELIVERY_CHARS)
          );
          replied++;
          Object.assign(conn, deliveryBudgetUpdate(conn));
        } catch (_) {
          failed++;
        }
      }
    }

    // Advance the watermark after each message so a crash never duplicates
    // a reply.
    await client.entities.UserAgentConnection.update(conn.id, {
      last_processed_message_id: entry.message_id || '',
      last_processed_at: entry.at.toISOString(),
      reply_hour_key: conn.reply_hour_key || '',
      reply_count: Number(conn.reply_count || 0),
    }).catch(() => {});

    processed++;
  }

  return { processed, replied, failed };
}