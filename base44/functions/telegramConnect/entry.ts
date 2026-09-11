import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  botToken,
  getBotIdentity,
  sendTelegramMessage,
  webhookSecret,
  deliveryBudgetUpdate,
} from '../../shared/telegramBridge.ts';

// Telegram Connect — the official LBC AI bot. The bot token lives in app
// secrets, server-side only. Users pair their phone with a short-lived
// 6-digit code; no tokens ever reach a client.
//
// Actions:
//  - verify:    live getMe with the secret token → honest bot username or
//               "Bot Token Invalid — Check The Token". Never fake success.
//  - pair:      generate a single-use 6-digit pairing code for the user's
//               agent, valid 15 minutes, stored on UserAgentConnection.
//  - test:      send a real test message through the bot to the paired chat.
//  - setWebhook: admin-only — register this app's public webhook endpoint
//               with Telegram, returning the honest Telegram API response.
//
// Security model:
//  - The agent is resolved with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id returns nothing → 404.
//  - owner_email + ownership_state are stamped from the session, never read
//    from the body.
//  - Pairing codes expire and are single-use (consumed by the webhook).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    const token = botToken();
    if (!token) {
      return Response.json({ error: 'Bot Token Not Configured' }, { status: 503 });
    }

    // ---- Verify the bot identity with a live Telegram call ----
    if (action === 'verify') {
      try {
        const identity = await getBotIdentity(token);
        return Response.json({ ok: true, username: (identity && identity.username) || '' });
      } catch (_) {
        return Response.json({ ok: false, error: 'Bot Token Invalid — Check The Token' });
      }
    }

    // ---- Admin-only: register the webhook endpoint with Telegram ----
    if (action === 'setWebhook') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      let res;
      try {
        res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://lumina-mirror-mind.base44.app/functions/telegramWebhook',
            secret_token: await webhookSecret(),
            allowed_updates: ['message'],
          }),
        });
      } catch (_) {
        return Response.json({ ok: false, error: 'Telegram Is Unreachable — Check The Connection And Try Again' });
      }
      const payload = await res.json().catch(() => null);
      return Response.json({
        ok: !!(payload && payload.ok),
        telegram_response: (payload && payload.description) || '',
        result: payload && payload.result,
      });
    }

    // ---- Generate a single-use pairing code for the user's agent ----
    if (action === 'pair') {
      const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
      if (!agentId) return Response.json({ error: 'Missing Agent' }, { status: 400 });

      // RLS-verified ownership — a foreign agent id filters to nothing.
      let agents = [];
      try {
        agents = await base44.entities.UserAgent.filter({ id: agentId });
      } catch (_) {}
      const agent = agents && agents[0];
      if (!agent) return Response.json({ error: 'Not Found' }, { status: 404 });
      if (agent.status === 'archived') {
        return Response.json({ error: 'This Agent Is Archived' }, { status: 403 });
      }

      let conns = [];
      try {
        conns = await base44.entities.UserAgentConnection.filter({ agent_id: agentId });
      } catch (_) {}
      const existing = (conns || [])[0];
      if (existing && existing.status === 'connected') {
        return Response.json({ error: 'This Agent Is Already Connected To Telegram' }, { status: 409 });
      }

      // Single-use 6-digit code, valid 15 minutes.
      const rand = new Uint32Array(1);
      crypto.getRandomValues(rand);
      const code = String(100000 + (rand[0] % 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const fields = {
        status: 'pending_pairing',
        channel: 'telegram',
        pairing_code: code,
        pairing_expires_at: expiresAt,
        chat_id: '',
        bot_username: '',
        reply_hour_key: '',
        reply_count: 0,
      };

      if (existing) {
        await base44.entities.UserAgentConnection.update(existing.id, fields);
      } else {
        await base44.entities.UserAgentConnection.create({
          agent_id: agentId,
          owner_email: user.email,
          ownership_state: 'human_verified',
          ...fields,
        });
      }

      return Response.json({ ok: true, code, expires_at: expiresAt });
    }

    // ---- Test Message — a real delivery to the paired chat ----
    if (action === 'test') {
      const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
      if (!agentId) return Response.json({ error: 'Missing Agent' }, { status: 400 });

      let agents = [];
      try {
        agents = await base44.entities.UserAgent.filter({ id: agentId });
      } catch (_) {}
      const agent = agents && agents[0];
      if (!agent) return Response.json({ error: 'Not Found' }, { status: 404 });

      let conns = [];
      try {
        conns = await base44.entities.UserAgentConnection.filter({ agent_id: agentId });
      } catch (_) {}
      const conn = (conns || []).find(c => c && c.status === 'connected' && c.chat_id);
      if (!conn) {
        return Response.json({ sent: false, reason: 'Pair Telegram First — Send /start And Your Code To The Bot' });
      }

      try {
        await sendTelegramMessage(
          token,
          conn.chat_id,
          `✅ Test Message From ${agent.name} — Your LBC AI Agent Is Connected.`
        );
        await base44.entities.UserAgentConnection.update(conn.id, deliveryBudgetUpdate(conn)).catch(() => {});
        return Response.json({ sent: true });
      } catch (err) {
        return Response.json({
          sent: false,
          reason: (err && err.message) || 'The Test Message Could Not Be Sent — Try Again In A Moment',
        });
      }
    }

    return Response.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (_) {
    // Never log the bot token or request contents.
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}