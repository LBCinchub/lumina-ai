import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  botToken,
  getBotIdentity,
  sendTelegramMessage,
  webhookSecret,
  withinDeliveryBudget,
  deliveryBudgetUpdate,
  MAX_DELIVERY_CHARS,
} from '../../shared/telegramBridge.ts';
import { runAgentTurn, MAX_HISTORY_MESSAGES } from '../../shared/userAgents.ts';

// Telegram webhook — receives live updates from the official LBC AI bot.
//
// Flow:
//  - "/start <code>" (or a bare 6-digit code): matches a single-use pairing
//    code to a pending connection, stores the chat id, and confirms.
//  - Messages from a paired chat: run the user's LBC AI agent server-side
//    (same persona + voice + instructions + knowledge flow as the in-app
//    chat), save the message pair to UserAgentMessage, and reply through
//    sendMessage.
//  - Unpaired chats get the honest reply: "Please Pair This Bot With Your
//    Agent In LBC AI First."
//
// Security model:
//  - Only calls carrying the Telegram webhook secret header are processed.
//  - The bot token stays in secrets — never logged, never returned.
//  - Only paired chat ids are processed; each connection's agent must carry
//    the same server-stamped owner as the connection.
//  - All writes use the service role with explicit server-stamped ownership.
//  - Replies are rate-limited per connection per hour.
export default async function(req) {
  try {
    // Only genuine Telegram calls are processed.
    const expected = await webhookSecret();
    if (!expected || req.headers.get('x-telegram-bot-api-secret-token') !== expected) {
      return Response.json({ ok: false }, { status: 403 });
    }

    const token = botToken();
    if (!token) return Response.json({ ok: false }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const message = body && body.message;
    const text = message && typeof message.text === 'string' ? message.text.trim() : '';
    const chatId = message && message.chat && message.chat.id !== undefined ? String(message.chat.id) : '';
    if (!text || !chatId) return Response.json({ ok: true });

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const now = new Date();

    // Reply helper — never fatal; webhook always answers ok to Telegram.
    const reply = (t) => sendTelegramMessage(token, chatId, t).catch(() => {});

    // ---- Pairing: "/start 483920" (deep link or typed) or a bare 6-digit code ----
    const startMatch = text.match(/^\/start\s+(\d{6})$/);
    const bareMatch = text.match(/^(\d{6})$/);
    if (startMatch || bareMatch) {
      const code = (startMatch || bareMatch)[1];

      let conns = [];
      try {
        conns = await service.entities.UserAgentConnection.filter(
          { pairing_code: code, status: 'pending_pairing' }
        );
      } catch (_) {}
      const candidates = conns || [];
      const valid = candidates.find(
        c => c.pairing_expires_at && new Date(c.pairing_expires_at) > now
      );

      if (!valid) {
        if (candidates.length > 0) {
          // Expired — consume the code so it stays single-use.
          await service.entities.UserAgentConnection.update(candidates[0].id, {
            pairing_code: '',
            status: 'disconnected',
          }).catch(() => {});
          await reply('Pairing Code Expired — Generate A New One In LBC AI');
        } else {
          await reply('Please Pair This Bot With Your Agent In LBC AI First');
        }
        return Response.json({ ok: true });
      }

      // The connection's agent must exist and carry the same stamped owner.
      let agents = [];
      try {
        agents = await service.entities.UserAgent.filter({ id: valid.agent_id });
      } catch (_) {}
      const agent = agents && agents[0];
      if (!agent || agent.owner_email !== valid.owner_email || agent.status === 'archived') {
        await service.entities.UserAgentConnection.update(valid.id, {
          pairing_code: '',
          status: 'disconnected',
        }).catch(() => {});
        await reply('Pairing Could Not Complete — Check Your Agent In LBC AI And Try Again');
        return Response.json({ ok: true });
      }

      const identity = await getBotIdentity(token).catch(() => null);
      await service.entities.UserAgentConnection.update(valid.id, {
        status: 'connected',
        chat_id: chatId,
        bot_username: (identity && identity.username) || '',
        paired_at: now.toISOString(),
        pairing_code: '',       // Single-use: consumed forever.
        pairing_expires_at: '',
        reply_hour_key: '',
        reply_count: 0,
      }).catch(() => {});

      await reply(`Paired — ${agent.name} Will Now Answer You Here. Send A Message To Try It.`);
      return Response.json({ ok: true });
    }

    // ---- /start without a code → honest instructions ----
    if (text.startsWith('/start')) {
      await reply('Send /start Followed By Your 6-Digit Pairing Code From LBC AI — For Example: /start 483920');
      return Response.json({ ok: true });
    }

    // ---- Chat message: only paired chats are processed ----
    let conns = [];
    try {
      conns = await service.entities.UserAgentConnection.filter(
        { chat_id: chatId, status: 'connected' }
      );
    } catch (_) {}
    const conn = (conns || [])[0];
    if (!conn || !conn.owner_email) {
      await reply('Please Pair This Bot With Your Agent In LBC AI First');
      return Response.json({ ok: true });
    }

    let agents = [];
    try {
      agents = await service.entities.UserAgent.filter({ id: conn.agent_id });
    } catch (_) {}
    const agent = agents && agents[0];
    if (!agent || agent.owner_email !== conn.owner_email || agent.status === 'archived') {
      await service.entities.UserAgentConnection.update(conn.id, {
        status: 'disconnected',
      }).catch(() => {});
      await reply('This Connection Is No Longer Active — Reconnect Your Agent In LBC AI');
      return Response.json({ ok: true });
    }

    if (!withinDeliveryBudget(conn, now)) {
      await reply('Reply Limit Reached For This Hour — Try Again A Little Later');
      return Response.json({ ok: true });
    }

    // Same history + knowledge flow as the in-app chat.
    const content = text.slice(0, 8000);
    const history = await service.entities.UserAgentMessage.filter(
      { agent_id: agent.id }, 'created_date', MAX_HISTORY_MESSAGES
    ).catch(() => []);

    await service.entities.UserAgentMessage.create({
      agent_id: agent.id,
      role: 'user',
      content,
      owner_email: conn.owner_email,
      ownership_state: 'human_verified',
    }).catch(() => {});

    let answer = '';
    try {
      answer = await runAgentTurn(service, agent, { history, userMessage: content });
    } catch (_) {
      answer = '';
    }

    if (!answer) {
      await reply('The Agent Could Not Respond Right Now — Try Again Shortly');
      return Response.json({ ok: true });
    }

    await service.entities.UserAgentMessage.create({
      agent_id: agent.id,
      role: 'assistant',
      content: answer,
      owner_email: conn.owner_email,
      ownership_state: 'human_verified',
    }).catch(() => {});

    try {
      await sendTelegramMessage(token, chatId, answer.slice(0, MAX_DELIVERY_CHARS));
      await service.entities.UserAgentConnection.update(
        conn.id, deliveryBudgetUpdate(conn, now)
      ).catch(() => {});
    } catch (_) {
      await reply('The Reply Could Not Be Delivered — Try Again In A Moment');
    }

    return Response.json({ ok: true });
  } catch (_) {
    return Response.json({ ok: false }, { status: 500 });
  }
}