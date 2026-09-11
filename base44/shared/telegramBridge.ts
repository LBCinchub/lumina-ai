// Server-side Telegram bridge — connects a user's LBC AI agent to their own
// Telegram bot (created in Telegram with the official BotFather). Brand: LBC
// AI everywhere; the agent's brain is always LBC AI, the bot only carries
// messages on the user's own Telegram channel.
//
// The bot token is decrypted in-memory only — never logged, never returned to
// any client, and honest error states are surfaced instead of fake success.

import { decryptCredential } from './userAgents.ts';

export const DELIVERY_HOUR_LIMIT = 20;        // Max bridge deliveries per connection per hour.
export const MIRROR_COOLDOWN_MS = 30 * 1000;  // In-app chat mirror cooldown.
export const MAX_DELIVERY_CHARS = 4000;
export const SYNC_UPDATES_PER_RUN = 5;        // Max Telegram updates processed per connection per sync.

// Honest, user-facing errors — never fake success, never leak the token.
export class TelegramError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TelegramError';
  }
}

const TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;

// Validates the BotFather token shape. Anything else is rejected honestly.
export function parseBotToken(input) {
  const s = String(input || '').trim();
  return TOKEN_RE.test(s) ? s : null;
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
      throw new TelegramError('Telegram Rejected This Bot Token — Create A New Token With BotFather And Reconnect');
    }
    if (res.status === 404) {
      throw new TelegramError('Telegram Does Not Know This Bot — Create A New Token With BotFather And Reconnect');
    }
    throw new TelegramError('Telegram Could Not Complete The Request — Try Again In A Moment');
  }
  return payload.result;
}

// Live identity check — proves the token is real before anything is saved.
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

// Newest pending Telegram update id, used to seed the processing watermark on
// connect so the bridge never replays messages sent before the connection.
export async function latestUpdateId(token) {
  const updates = await tgFetch(token, 'getUpdates', { offset: -1, limit: 1, timeout: 0 });
  return (Array.isArray(updates) && updates[0]) ? Number(updates[0].update_id) : 0;
}

// New Telegram updates after the watermark. Only text messages count —
// group edits, channel posts, and non-text updates are ignored.
export async function collectNewUpdates(token, lastUpdateId) {
  const updates = await tgFetch(token, 'getUpdates', {
    offset: Number(lastUpdateId || 0) + 1,
    limit: SYNC_UPDATES_PER_RUN,
    timeout: 0,
  });
  const entries = [];
  for (const u of Array.isArray(updates) ? updates : []) {
    const msg = u && u.message;
    const text = msg && msg.text;
    if (!text) continue;
    entries.push({
      update_id: Number(u.update_id),
      chat_id: String(msg.chat && msg.chat.id),
      text: String(text).slice(0, 8000),
    });
  }
  entries.sort((a, b) => a.update_id - b.update_id);
  return entries;
}

// ---------------------------------------------------------------------------
// Delivery rate limiting (shared by chat mirror, Autopilot, and sync replies)
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
// One-shot delivery of an LBC AI reply to the user's phone through their
// Telegram bot. Never throws — always returns an honest { sent, reason }.
// `client` must be scoped to the connection owner.
// ---------------------------------------------------------------------------

export async function deliverViaTelegram(client, agentId, text, options = {}) {
  try {
    const conns = await client.entities.UserAgentConnection.filter(
      { agent_id: agentId, status: 'connected' }
    ).catch(() => []);
    const conn = (conns || [])[0];
    if (!conn || !conn.api_key_encrypted || !conn.chat_id) {
      return { sent: false, reason: 'Not Connected' };
    }
    if (options.mirror && !mirrorCooldownPassed(conn)) {
      return { sent: false, reason: 'Cooldown' };
    }
    if (!withinDeliveryBudget(conn)) {
      return { sent: false, reason: 'Rate Limited' };
    }
    const token = await decryptCredential(conn.api_key_encrypted);
    await sendTelegramMessage(token, conn.chat_id, text);
    const updates = deliveryBudgetUpdate(conn);
    if (options.mirror) updates.last_mirror_at = new Date().toISOString();
    await client.entities.UserAgentConnection.update(conn.id, updates).catch(() => {});
    return { sent: true, reason: null };
  } catch (err) {
    return { sent: false, reason: (err && err.message) || 'Telegram Is Unreachable — Check Your Connection' };
  }
}