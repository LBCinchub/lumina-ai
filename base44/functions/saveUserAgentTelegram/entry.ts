import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  encryptBotToken,
  telegramWebhookSecret,
  isValidTelegramToken,
} from '../../shared/userAgents.ts';

const WEBHOOK_URL = 'https://lumina-mirror-mind.base44.app/functions/telegramWebhook';

// Connects one of the user's agents to their own Telegram bot.
//
// Security model:
//  - The agent is resolved with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id returns nothing → 404.
//  - The bot token is validated with Telegram (getMe) and the webhook is
//    registered BEFORE anything is stored.
//  - The token is stored as AES-256-GCM ciphertext. The plaintext never
//    returns to the client and is never logged.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const botToken = typeof body.bot_token === 'string' ? body.bot_token.trim() : '';
    if (!agentId || !botToken) {
      return Response.json({ error: 'Missing agent_id or bot token' }, { status: 400 });
    }
    if (!isValidTelegramToken(botToken)) {
      return Response.json(
        { error: 'That does not look like a Telegram bot token. Copy it exactly from BotFather.' },
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

    // Validate the token with Telegram before storing anything.
    const meRes = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/getMe`
    ).catch(() => null);
    const meData = meRes ? await meRes.json().catch(() => null) : null;
    if (!meData || meData.ok !== true) {
      return Response.json(
        { error: 'Telegram rejected this token. Make sure you copied it exactly from BotFather.' },
        { status: 400 }
      );
    }
    const botUsername = (meData.result && meData.result.username) || '';

    // Register the webhook so Telegram messages reach the app. The secret
    // token is derived from the bot token, letting the webhook resolve the
    // owning connection server-side without trusting client input.
    const secret = await telegramWebhookSecret(botToken);
    const whRes = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          secret_token: secret,
          allowed_updates: ['message'],
        }),
      }
    ).catch(() => null);
    const whData = whRes ? await whRes.json().catch(() => null) : null;
    if (!whData || whData.ok !== true) {
      return Response.json(
        { error: 'Could not register the bot webhook with Telegram. Please try again.' },
        { status: 502 }
      );
    }

    const tokenEncrypted = await encryptBotToken(botToken);

    // Upsert the connection — user-scoped, so RLS enforces ownership.
    let existing = [];
    try {
      existing = await base44.entities.UserAgentConnection.filter(
        { agent_id: agentId, channel: 'telegram' }
      );
    } catch (_) {}
    if (existing && existing[0]) {
      await base44.entities.UserAgentConnection.update(existing[0].id, {
        status: 'connected',
        token_encrypted: tokenEncrypted,
        webhook_secret: secret,
        bot_username: botUsername,
        connected_at: new Date().toISOString(),
        chat_id: existing[0].chat_id || '',
        reply_hour_key: '',
        reply_count: 0,
      });
    } else {
      await base44.entities.UserAgentConnection.create({
        agent_id: agentId,
        channel: 'telegram',
        status: 'connected',
        token_encrypted: tokenEncrypted,
        webhook_secret: secret,
        bot_username: botUsername,
        connected_at: new Date().toISOString(),
        owner_email: user.email,
        ownership_state: 'human_verified',
      });
    }

    return Response.json({ connected: true, bot_username: botUsername });
  } catch (_) {
    // Never log the token or request contents.
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}