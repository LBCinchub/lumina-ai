import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_CHARS_PER_MSG,
  MAX_MESSAGE_CHARS,
  TELEGRAM_REPLY_HOUR_LIMIT,
  telegramHourKey,
  buildAgentSystemPrompt,
  decryptBotToken,
} from '../../shared/userAgents.ts';

// Telegram webhook: receives updates for every connected bot and runs the
// owning user's agent server-side, replying through the Bot API.
//
// Security model:
//  - No user auth: authenticity comes from the X-Telegram-Bot-Api-Secret-Token
//    header, which is the SHA-256 of the bot token that only Telegram and our
//    server know. The connection (and therefore the owner and agent) is
//    resolved from that secret — never from client-supplied ids.
//  - Unknown secrets are rejected. Nothing about connections is revealed.
//  - Replies are rate-limited per connection per hour.
//  - Tokens and message contents are never logged or included in errors.
//  - The LLM runs exclusively server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const secret = req.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!secret) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const update = await req.json().catch(() => null);
    const message = update && update.message;
    if (!message || !message.text || !message.chat) {
      return Response.json({ ok: true });
    }
    const text = String(message.text).slice(0, MAX_MESSAGE_CHARS);
    const chatId = String(message.chat.id);

    // Ownership resolved from the token-derived secret — not client input.
    let conns = [];
    try {
      conns = await service.entities.UserAgentConnection.filter(
        { webhook_secret: secret, channel: 'telegram' }
      );
    } catch (_) {}
    const conn = conns && conns[0];
    if (!conn) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Remember the owner's chat id so Test Message and Autopilot delivery work.
    if (conn.chat_id !== chatId || conn.status !== 'connected') {
      try {
        await service.entities.UserAgentConnection.update(conn.id, { chat_id: chatId, status: 'connected' });
      } catch (_) {}
    }

    // Sensible rate limit per connection per hour.
    const hourKey = telegramHourKey();
    const count = conn.reply_hour_key === hourKey ? (conn.reply_count || 0) : 0;
    if (count >= TELEGRAM_REPLY_HOUR_LIMIT) {
      return Response.json({ ok: true });
    }
    try {
      await service.entities.UserAgentConnection.update(conn.id, { reply_hour_key: hourKey, reply_count: count + 1 });
    } catch (_) {}

    // Resolve the agent server-side from the connection.
    let agents = [];
    try {
      agents = await service.entities.UserAgent.filter({ id: conn.agent_id });
    } catch (_) {}
    const agent = agents && agents[0];
    const ownerEmail = conn.owner_email || '';
    if (!agent || !ownerEmail) return Response.json({ ok: true });

    if (agent.status === 'archived') {
      await sendTelegramReply(service, conn, 'This agent is archived. Restore it in LBC AI to keep chatting.').catch(() => {});
      return Response.json({ ok: true });
    }

    // Same knowledge + history flow as the in-app chat.
    let knowledge = [];
    if (Array.isArray(agent.knowledge_source_ids) && agent.knowledge_source_ids.length > 0) {
      try {
        knowledge = await service.entities.KnowledgeSource.filter(
          { id: { $in: agent.knowledge_source_ids }, is_active: true, status: 'ready' }
        );
      } catch (_) {}
    }
    const history = await service.entities.UserAgentMessage.filter(
      { agent_id: agent.id }, 'created_date', MAX_HISTORY_MESSAGES
    ).catch(() => []);

    await service.entities.UserAgentMessage.create({
      agent_id: agent.id,
      role: 'user',
      content: text,
      owner_email: ownerEmail,
      ownership_state: 'human_verified',
    }).catch(() => {});

    const systemPrompt = buildAgentSystemPrompt(agent, knowledge);
    const historyBlock = history.length > 0
      ? history.map(m =>
          `${m.role === 'user' ? 'User' : 'Agent'}: ${(m.content || '').slice(0, MAX_HISTORY_CHARS_PER_MSG)}`
        ).join('\n\n')
      : '(No prior messages with this agent.)';

    const fullPrompt = `${systemPrompt}

---

CONVERSATION SO FAR:
${historyBlock}

User: ${text}

Respond as ${agent.name} directly, without prefixing your name.`;

    let content = '';
    try {
      const llmResponse = await service.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      content = typeof llmResponse === 'string' ? llmResponse : (llmResponse && llmResponse.content) || '';
    } catch (_) {}
    if (!content) content = 'I could not respond just now — please try again in a moment.';

    await service.entities.UserAgentMessage.create({
      agent_id: agent.id,
      role: 'assistant',
      content,
      owner_email: ownerEmail,
      ownership_state: 'human_verified',
    }).catch(() => {});

    await sendTelegramReply(service, conn, content).catch(() => {});
    return Response.json({ ok: true });
  } catch (_) {
    // Never leak tokens or message contents in errors; answer 200 so Telegram
    // does not retry a permanently failed update.
    return Response.json({ ok: true });
  }
}

async function sendTelegramReply(service, conn, text) {
  if (!conn.chat_id) return;
  let token = '';
  try {
    token = await decryptBotToken(conn.token_encrypted);
  } catch (_) {
    return;
  }
  const truncated = String(text).slice(0, 4000);
  await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: conn.chat_id, text: truncated }),
  });
}