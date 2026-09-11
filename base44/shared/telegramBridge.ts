// Server-side Telegram bridge — connects LBC AI agents to the official LBC
// AI Telegram bot. Brand: LBC AI everywhere; the agent's brain is always LBC
// AI, the bot only carries messages on the user's phone.
//
// The bot token lives in app secrets — server-side only. It is never sent to
// any client, never logged, and honest error states are surfaced instead of
// fake success.

import { secrets } from 'base44:runtime';

export const DELIVERY_HOUR_LIMIT = 20;        // Max bridge deliveries per connection per hour.
export const MIRROR_COOLDOWN_MS = 30 * 1000;  // In-app chat mirror cooldown.
export const MAX_DELIVERY_CHARS = 4000;

// Honest, user-facing errors — never fake success, never leak the token.
export class TelegramError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TelegramError';
  }
}

// The bot token from app secrets — server-side only. Trimmed: trailing
// whitespace or a newline from secret storage would break the API URL and
// falsely look like an invalid token.
export function botToken() {
  return String(secrets.get('TELEGRAM_BOT_TOKEN') || '').trim();
}

// Shared secret between webhook registration and the webhook handler, so
// only genuine Telegram calls are ever processed. Derived from an existing
// server-side secret — never exposed to any client.
export async function webhookSecret() {
  const material = new TextEncoder().encode('lbc-telegram-webhook:' + (secrets.get('VPS_API_HASH') || ''));
  const digest = await crypto.subtle.digest('SHA-256', material);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function tgFetch(token, method, body) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    throw new TelegramError('Telegram Is Unreachable — Check Your Connection And Try Again');
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload || payload.ok !== true) {
    if (res.status === 401 || (payload && payload.description && /unauthorized/i.test(payload.description))) {
      throw new TelegramError('Bot Token Invalid — Check The Token');
    }
    if (res.status === 404) {
      throw new TelegramError('Bot Token Invalid — Check The Token');
    }
    throw new TelegramError('Telegram Could Not Complete The Request — Try Again In A Moment');
  }
  return payload.result;
}

// Live identity check — proves the token is real.
export async function getBotIdentity(token) {
  return tgFetch(token, 'getMe');
}

// Sends a text message to one Telegram chat.
export async function sendTelegramMessage(token, chatId, text) {
  await tgFetch(token, 'sendMessage', {
    chat_id: chatId,
    text: String(text || '').slice(0, MAX_DELIVERY_CHARS),
  });
}

// ---------------------------------------------------------------------------
// Delivery rate limiting (shared by chat mirror, Autopilot, and webhook replies)
// ---------------------------------------------------------------------------

export function deliveryHourKey(now = new Date()) {
  return now.toISOString().slice(0, 13) + ':00';
}

export function withinDeliveryBudget(conn, now = new Date()) {
  return !(conn.reply_hour_key === deliveryHourKey(now) && Number(conn.reply_count || 0) >= DELIVERY_HOUR_LIMIT);
}

// The field updates to persist after one successful delivery.
export function deliveryBudgetUpdate(conn, now = new Date()) {
  const hourKey = deliveryHourKey(now);
  const count = conn.reply_hour_key === hourKey ? Number(conn.reply_count || 0) + 1 : 1;
  return { reply_hour_key: hourKey, reply_count: count };
}

export function mirrorCooldownPassed(conn, nowMs = Date.now()) {
  if (!conn.last_mirror_at) return true;
  const t = new Date(conn.last_mirror_at).getTime();
  return Number.isNaN(t) || (nowMs - t) >= MIRROR_COOLDOWN_MS;
}

// ---------------------------------------------------------------------------
// One-shot delivery of an LBC AI reply to the user's phone through the
// official LBC AI bot. Never throws — always returns an honest { sent, reason }.
// `client` must be scoped to the connection owner.
// ---------------------------------------------------------------------------

export async function deliverViaTelegram(client, agentId, text, options = {}) {
  try {
    const conns = await client.entities.UserAgentConnection.filter(
      { agent_id: agentId, status: 'connected' }
    ).catch(() => []);
    const conn = (conns || [])[0];
    if (!conn || !conn.chat_id) {
      return { sent: false, reason: 'Not Connected' };
    }
    if (options.mirror && !mirrorCooldownPassed(conn)) {
      return { sent: false, reason: 'Cooldown' };
    }
    if (!withinDeliveryBudget(conn)) {
      return { sent: false, reason: 'Rate Limited' };
    }
    const token = botToken();
    if (!token) {
      return { sent: false, reason: 'Bot Token Not Configured' };
    }
    await sendTelegramMessage(token, conn.chat_id, text);
    const updates = deliveryBudgetUpdate(conn);
    if (options.mirror) updates.last_mirror_at = new Date().toISOString();
    await client.entities.UserAgentConnection.update(conn.id, updates).catch(() => {});
    return { sent: true, reason: null };
  } catch (err) {
    return { sent: false, reason: (err && err.message) || 'Telegram Is Unreachable — Check Your Connection' };
  }
}