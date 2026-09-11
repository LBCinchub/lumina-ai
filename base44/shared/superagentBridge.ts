// Server-side Superagent Bridge — connects a user's LBC AI agent to their own
// Base44 Superagent (Bring Your Own Superagent). Brand: LBC AI everywhere.
//
// The user's Superagent runs on THEIR own Base44 account: it holds the phone
// channels (Telegram, WhatsApp, iMessage) and its external API is the only
// transport. This module talks to that API server-side. The API key is
// decrypted in-memory only — never logged, never returned to any client,
// and honest error states are surfaced instead of fake success.

import { decryptCredential } from './userAgents.ts';

export const SUPERAGENT_API_BASE = 'https://app.base44.com/api';

export const DELIVERY_HOUR_LIMIT = 20;       // Max bridge deliveries per connection per hour.
export const MIRROR_COOLDOWN_MS = 30 * 1000;  // In-app chat mirror cooldown.
export const SYNC_MESSAGES_PER_RUN = 5;       // Max phone messages processed per connection per sync.
export const MAX_DELIVERY_CHARS = 4000;

// Honest, user-facing errors — never fake success, never leak the key.
export class SuperagentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SuperagentError';
  }
}

function honestError(status) {
  if (status === 401 || status === 403) {
    return new SuperagentError('Your Superagent rejected the API key — recheck the Agent ID and API Key in its Developer panel.');
  }
  if (status === 404) {
    return new SuperagentError('That Agent ID was not found — recheck your Superagent\'s Developer panel.');
  }
  if (status === 402) {
    return new SuperagentError('Your Base44 account may be out of credits — check your account.');
  }
  return new SuperagentError('Your Superagent Is Unreachable — Check Your Base44 Account');
}

const UNREACHABLE = () => new SuperagentError('Your Superagent Is Unreachable — Check Your Base44 Account');

async function apiFetch(url, apiKey, init = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
      },
    });
  } catch (_) {
    throw UNREACHABLE();
  }
  if (!res.ok) throw honestError(res.status);
  return res;
}

// Accepts a bare Agent ID or a full API URL and extracts the Agent ID
// (the segment after /agents/).
export function parseSuperagentAgentId(input) {
  let s = String(input || '').trim();
  if (!s) return null;
  const idx = s.indexOf('/agents/');
  if (idx !== -1) {
    s = s.slice(idx + '/agents/'.length);
  } else if (s.includes('/')) {
    s = s.split('/').filter(Boolean).pop() || '';
  }
  s = s.split('?')[0].split('#')[0].trim();
  return /^[A-Za-z0-9_-]{4,80}$/.test(s) ? s : null;
}

// GET /api/agents/<id>/conversations — returns a normalized conversation list.
// Each conversation: { id, messages: [...] } (messages may be absent).
export async function listSuperagentConversations(superagentAgentId, apiKey) {
  const res = await apiFetch(`${SUPERAGENT_API_BASE}/agents/${encodeURIComponent(superagentAgentId)}/conversations`, apiKey);
  const payload = await res.json().catch(() => null);
  const raw = Array.isArray(payload)
    ? payload
    : (payload && Array.isArray(payload.conversations))
      ? payload.conversations
      : (payload && Array.isArray(payload.data) ? payload.data : []);
  return raw
    .filter(c => c && (c.id || c.conversation_id))
    .map(c => ({ ...c, id: c.id || c.conversation_id }));
}

export function defaultConversationOf(conversations) {
  return (Array.isArray(conversations) && conversations[0]) || null;
}

// POST a message into one of the Superagent's conversations. LBC AI replies
// are posted with role "assistant" so they land on the user's phone without
// triggering the Superagent's own brain.
export async function sendSuperagentMessage(superagentAgentId, apiKey, conversationId, role, content) {
  await apiFetch(
    `${SUPERAGENT_API_BASE}/agents/${encodeURIComponent(superagentAgentId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    apiKey,
    {
      method: 'POST',
      body: JSON.stringify({ role, content: String(content || '').slice(0, MAX_DELIVERY_CHARS) }),
    }
  );
}

// POST a new conversation on the Superagent (used when none exists yet).
export async function createSuperagentConversation(superagentAgentId, apiKey) {
  const res = await apiFetch(
    `${SUPERAGENT_API_BASE}/agents/${encodeURIComponent(superagentAgentId)}/conversations`,
    apiKey,
    { method: 'POST', body: JSON.stringify({}) }
  );
  const payload = await res.json().catch(() => null);
  const conv = (payload && (payload.conversation || payload.data || payload)) || null;
  const id = conv && (conv.id || conv.conversation_id);
  if (!id) throw UNREACHABLE();
  return { ...conv, id };
}

// Live round-trip test: list conversations (auth check), then POST a short
// test message to the default conversation — the Superagent's reply is
// delivered to the user's connected phone channel. Throws SuperagentError
// with an honest reason on any failure.
export async function testSuperagentConnection(superagentAgentId, apiKey) {
  const conversations = await listSuperagentConversations(superagentAgentId, apiKey);
  let conv = defaultConversationOf(conversations);
  if (!conv) {
    conv = await createSuperagentConversation(superagentAgentId, apiKey);
  }
  await sendSuperagentMessage(
    superagentAgentId,
    apiKey,
    conv.id,
    'user',
    'Hello — this is a test message from LBC AI. Please reply with one short line.'
  );
  return { conversation_count: conversations.length };
}

// New phone messages since the processing watermark. Never replays history:
// without a watermark nothing is processed. Only user-role messages count —
// the Superagent's own replies are ignored.
export async function collectNewUserMessages(superagentAgentId, apiKey, sinceIso) {
  if (!sinceIso) return [];
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return [];

  const conversations = await listSuperagentConversations(superagentAgentId, apiKey);
  const entries = [];
  for (const conv of conversations) {
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    for (const m of messages) {
      const role = String((m && m.role) || '').toLowerCase();
      if (role !== 'user' && role !== 'human') continue;
      const text = (m && (m.content || m.text || m.message)) || '';
      if (!text) continue;
      const created = (m && (m.created_at || m.createdAt || m.created_date)) || null;
      if (!created) continue;
      const at = new Date(created);
      if (Number.isNaN(at.getTime()) || at <= since) continue;
      entries.push({
        conversation_id: conv.id,
        message_id: (m && (m.id || m.message_id)) || '',
        text: String(text).slice(0, 8000),
        at,
      });
    }
  }
  entries.sort((a, b) => a.at - b.at);
  return entries.slice(0, SYNC_MESSAGES_PER_RUN);
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
// Superagent (default conversation). Never throws — always returns an
// honest { sent, reason }. `client` must be scoped to the connection owner.
// ---------------------------------------------------------------------------

export async function deliverViaSuperagent(client, agentId, text, options = {}) {
  try {
    const conns = await client.entities.UserAgentConnection.filter(
      { agent_id: agentId, status: 'connected' }
    ).catch(() => []);
    const conn = (conns || [])[0];
    if (!conn || !conn.api_key_encrypted || !conn.superagent_agent_id) {
      return { sent: false, reason: 'Not Connected' };
    }
    if (options.mirror && !mirrorCooldownPassed(conn)) {
      return { sent: false, reason: 'Cooldown' };
    }
    if (!withinDeliveryBudget(conn)) {
      return { sent: false, reason: 'Rate Limited' };
    }
    const apiKey = await decryptCredential(conn.api_key_encrypted);
    const conversations = await listSuperagentConversations(conn.superagent_agent_id, apiKey);
    const conv = defaultConversationOf(conversations);
    if (!conv) {
      return { sent: false, reason: 'Your Superagent Has No Conversations Yet' };
    }
    await sendSuperagentMessage(conn.superagent_agent_id, apiKey, conv.id, 'assistant', text);
    const updates = deliveryBudgetUpdate(conn);
    if (options.mirror) updates.last_mirror_at = new Date().toISOString();
    await client.entities.UserAgentConnection.update(conn.id, updates).catch(() => {});
    return { sent: true, reason: null };
  } catch (err) {
    return { sent: false, reason: (err && err.message) || 'Your Superagent Is Unreachable — Check Your Base44 Account' };
  }
}