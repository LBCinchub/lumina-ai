import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  runAgentTurn,
  decryptCredential,
  MAX_HISTORY_MESSAGES,
} from '../../shared/userAgents.ts';
import {
  collectNewUpdates,
  sendTelegramMessage,
  withinDeliveryBudget,
  deliveryBudgetUpdate,
  TelegramError,
  MAX_DELIVERY_CHARS,
} from '../../shared/telegramBridge.ts';

// Telegram bridge sync. For every agent connected to the user's own Telegram
// bot: fetches new Telegram messages since the stored watermark, runs the
// user's LBC AI agent on them (same persona + voice + instructions + knowledge
// flow as the in-app chat), persists both sides in the agent's chat history,
// and delivers the reply through the Telegram Bot API — landing on the user's
// phone. The bot only carries messages; the brain is LBC AI.
//
// Modes:
//  - { agent_id } → manual check (user session; RLS + 404 enforce that only
//    the owning user's connection is processed).
//  - {} → scheduled run (5-minute workflow; service role; every connection
//    must carry the SAME server-stamped owner as its agent).
//
// Security model:
//  - In manual mode all reads/writes are user-scoped — RLS isolation.
//  - In scheduled mode the connection and agent must match on
//    server-stamped owner_email, and both must be usable.
//  - The bot token is decrypted in-memory only, never logged, never returned.
//  - Telegram payloads are treated as untrusted message content.
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
      // ---- Manual check for one agent ----
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

      let agents = [];
      try {
        agents = await base44.entities.UserAgent.filter({ id: manualAgentId });
      } catch (_) {}
      const agent = agents && agents[0];
      if (!agent) return Response.json({ error: 'Not Found' }, { status: 404 });

      let conns = [];
      try {
        conns = await base44.entities.UserAgentConnection.filter({ agent_id: manualAgentId });
      } catch (_) {}
      const conn = (conns || []).find(
        c => c && c.status === 'connected' && c.api_key_encrypted
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
          note: (err && err.message) || 'Telegram Is Unreachable — Check Your Connection',
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
      if (!conn.api_key_encrypted || !conn.owner_email) continue;

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
  let token = '';
  try {
    token = await decryptCredential(conn.api_key_encrypted);
  } catch (_) {
    throw new TelegramError('The Stored Connection Could Not Be Read — Reconnect Your Bot');
  }

  const entries = await collectNewUpdates(token, conn.last_update_id);

  let processed = 0;
  let replied = 0;
  let failed = 0;

  for (const entry of entries) {
    // History BEFORE this turn's message — same flow as the in-app chat.
    const history = await client.entities.UserAgentMessage.filter(
      { agent_id: agent.id }, 'created_date', MAX_HISTORY_MESSAGES
    ).catch(() => []);

    // Persist the inbound Telegram message with the connection's stamped owner.
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

      // Deliver the reply to the chat the Telegram message came from.
      if (withinDeliveryBudget(conn)) {
        try {
          await sendTelegramMessage(token, entry.chat_id, reply.slice(0, MAX_DELIVERY_CHARS));
          replied++;
          Object.assign(conn, deliveryBudgetUpdate(conn));
        } catch (_) {
          failed++;
        }
      }
    }

    // Advance the watermark after each message so a crash never duplicates a
    // reply, and remember the owner's chat for mirrors and test messages.
    await client.entities.UserAgentConnection.update(conn.id, {
      chat_id: entry.chat_id,
      last_update_id: entry.update_id,
      reply_hour_key: conn.reply_hour_key || '',
      reply_count: Number(conn.reply_count || 0),
    }).catch(() => {});

    processed++;
  }

  return { processed, replied, failed };
}