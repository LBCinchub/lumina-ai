import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';
import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_CHARS,
  runAgentTurn,
  countAgentMessagesToday,
  FREE_DAILY_AGENT_MESSAGES,
} from '../../shared/userAgents.ts';
import { deliverViaTelegram } from '../../shared/telegramBridge.ts';

// Server-side chat with a user-owned agent.
//
// Security model:
//  - The agent is loaded with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id simply returns nothing → 404. Cross-user
//    chat is impossible; the existence of a foreign agent is never revealed.
//  - Knowledge sources and message history are also user-scoped reads.
//  - Both messages (user + assistant) are created with server-stamped
//    owner_email + ownership_state from the authenticated session.
//  - The LLM is called exclusively server-side. No client-side InvokeLLM.
//  - When the agent is connected to the user's Telegram bot, the reply is
//    mirrored to their phone after the response (30s cooldown, hourly cap,
//    never blocks or breaks the chat).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : '';
    if (!agentId || !message) {
      return Response.json({ error: 'Missing agent_id or message' }, { status: 400 });
    }

    // RLS-verified ownership: a foreign id filters to nothing (the SDK may
    // also throw on an invalid id) — either way it is not the caller's agent.
    // Never reveal whether a foreign agent exists.
    let agents = [];
    try {
      agents = await base44.entities.UserAgent.filter({ id: agentId });
    } catch (_) {}
    const agent = agents && agents[0];
    if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });
    if (agent.status === 'archived') {
      return Response.json({ error: 'This agent is archived' }, { status: 403 });
    }

    // Free-tier daily message cap — server-side, honest rejection. Never fake.
    const todayCount = await countAgentMessagesToday(base44);
    if (todayCount >= FREE_DAILY_AGENT_MESSAGES) {
      return Response.json({
        error: `Daily Message Limit Reached — You Have Used ${FREE_DAILY_AGENT_MESSAGES} Messages Today. LBC AI Superagent Unlocks More Messages.`,
        limit_reached: true,
      }, { status: 429 });
    }

    // Per-agent message history (before this turn's message) — user-scoped read.
    const history = await base44.entities.UserAgentMessage.filter(
      { agent_id: agentId }, 'created_date', MAX_HISTORY_MESSAGES
    );

    // Save the user's message with server-stamped ownership.
    await base44.entities.UserAgentMessage.create({
      agent_id: agentId,
      role: 'user',
      content: message,
      owner_email: user.email,
      ownership_state: 'human_verified',
    });

    // Server-side LLM only — persona + voice + instructions + knowledge flow.
    const content = await runAgentTurn(base44, agent, { history, userMessage: message });

    if (!content) {
      return Response.json({ error: 'The agent could not respond. Please try again.' }, { status: 502 });
    }

    // Persist the assistant reply with server-stamped ownership.
    await base44.entities.UserAgentMessage.create({
      agent_id: agentId,
      role: 'assistant',
      content,
      owner_email: user.email,
      ownership_state: 'human_verified',
    });

    // Mirror the reply to the user's phone through their Telegram bot when
    // connected — post-response, rate-limited, and never fatal to the chat.
    waitUntil(deliverViaTelegram(base44, agentId, content, { mirror: true }));

    return Response.json({ content });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}