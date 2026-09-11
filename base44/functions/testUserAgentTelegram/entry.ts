import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { decryptBotToken } from '../../shared/userAgents.ts';

// Sends a test message through the user's connected Telegram bot.
// The chat id is learned from the owner's first message to the bot, so the
// test requires the user to have messaged their bot at least once.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    if (!agentId) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

    // RLS-verified ownership of the agent.
    let agents = [];
    try {
      agents = await base44.entities.UserAgent.filter({ id: agentId });
    } catch (_) {}
    const agent = agents && agents[0];
    if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });

    let conns = [];
    try {
      conns = await base44.entities.UserAgentConnection.filter(
        { agent_id: agentId, channel: 'telegram' }
      );
    } catch (_) {}
    const conn = conns && conns[0];
    if (!conn || conn.status !== 'connected') {
      return Response.json({ sent: false, reason: 'This agent is not connected to Telegram yet.' }, { status: 400 });
    }
    if (!conn.chat_id) {
      return Response.json({
        sent: false,
        reason: 'Open Telegram and send your bot any message first (for example "Hi"), then try again.',
      });
    }

    let token = '';
    try {
      token = await decryptBotToken(conn.token_encrypted);
    } catch (_) {
      return Response.json({ sent: false, reason: 'The stored connection could not be read. Reconnect the bot.' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conn.chat_id,
          text: `✅ Test Message — ${agent.name} is connected. Your LBC AI agent will reply here.`,
        }),
      }
    ).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (!data || data.ok !== true) {
      return Response.json({ sent: false, reason: 'Telegram could not deliver the message. Reconnect the bot and try again.' }, { status: 502 });
    }
    return Response.json({ sent: true });
  } catch (_) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}