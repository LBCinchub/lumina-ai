import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { encryptCredential } from '../../shared/userAgents.ts';
import { parseBotToken, getBotIdentity, latestUpdateId } from '../../shared/telegramBridge.ts';

// Connects one of the user's LBC AI agents to the user's own Telegram bot,
// created inside Telegram with the official BotFather. No external AI
// accounts, no external platform signups — the agent's brain is LBC AI.
//
// Security model:
//  - The agent is resolved with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id returns nothing → 404.
//  - The bot token is LIVE-TESTED against the real Telegram Bot API before
//    anything is saved — honest pass/fail, never fake success.
//  - The token is stored as AES-256-GCM ciphertext. The plaintext never
//    returns to the client and is never logged.
//  - The processing watermark is seeded to the newest pending update, so the
//    bridge never replays messages sent before the connection existed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const rawToken = typeof body.bot_token === 'string' ? body.bot_token.trim() : '';

    if (!agentId || !rawToken) {
      return Response.json({ error: 'Missing Agent Or Bot Token' }, { status: 400 });
    }

    const token = parseBotToken(rawToken);
    if (!token) {
      return Response.json(
        { error: 'That Does Not Look Like A Telegram Bot Token — Copy It Exactly From BotFather' },
        { status: 400 }
      );
    }

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

    // Live test BEFORE saving anything: prove the token is real with Telegram.
    let identity;
    let seedUpdateId = 0;
    try {
      identity = await getBotIdentity(token);
      seedUpdateId = await latestUpdateId(token);
    } catch (err) {
      return Response.json({
        connected: false,
        reason: (err && err.message) || 'Telegram Could Not Verify This Token — Check It And Try Again',
      });
    }

    const encrypted = await encryptCredential(token);
    const nowIso = new Date().toISOString();
    const fields = {
      status: 'connected',
      telegram_bot_username: (identity && identity.username) || '',
      api_key_encrypted: encrypted,
      chat_id: '',
      last_update_id: seedUpdateId, // Watermark: only messages after this are synced.
      connected_at: nowIso,
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

    return Response.json({ connected: true, bot_username: (identity && identity.username) || '' });
  } catch (_) {
    // Never log the bot token or request contents.
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}