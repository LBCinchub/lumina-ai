import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { decryptCredential } from '../../shared/userAgents.ts';
import { getBotIdentity, sendTelegramMessage, deliveryBudgetUpdate } from '../../shared/telegramBridge.ts';

// Verifies the user's stored Telegram connection with a live Telegram Bot API
// call, and can send a real test message to the owner's phone. Honest states
// only — never fake success, never leak the token.
//
// Security model:
//  - The agent is resolved with the USER-SCOPED client: a foreign agent id
//    returns nothing → 404. Only the owning user's connection is ever read.
//  - The token is decrypted in-memory only and never returned to any client.
//  - The test message goes to the stored chat id — the chat where the owner
//    last messaged their own bot.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const sendTest = body.send_test === true;
    if (!agentId) return Response.json({ error: 'Missing Agent' }, { status: 400 });

    // RLS-verified ownership — a foreign agent id filters to nothing.
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
    const conn = (conns || []).find(c => c && c.status === 'connected' && c.api_key_encrypted);
    if (!conn) {
      return Response.json({ connected: false, reason: 'Not Connected' });
    }

    let token = '';
    try {
      token = await decryptCredential(conn.api_key_encrypted);
    } catch (_) {
      return Response.json({ connected: false, reason: 'The Stored Connection Could Not Be Read — Reconnect Your Bot' });
    }

    // Test Message — a real delivery to the owner's phone, honest on failure.
    if (sendTest) {
      if (!conn.chat_id) {
        return Response.json({
          sent: false,
          reason: 'Send Your Bot A Message On Telegram First — Then Test Again',
        });
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

    // Plain connection check — live identity call to Telegram.
    try {
      const identity = await getBotIdentity(token);
      return Response.json({ connected: true, bot_username: (identity && identity.username) || '' });
    } catch (err) {
      return Response.json({ connected: false, reason: (err && err.message) || 'Telegram Could Not Verify This Connection' });
    }
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}