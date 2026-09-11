import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  MAX_HISTORY_MESSAGES, MAX_HISTORY_CHARS_PER_MSG, MAX_MESSAGE_CHARS,
  buildAgentSystemPrompt,
} from '../../shared/userAgents.ts';

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

    // Attached knowledge sources — user-scoped read, RLS-enforced ownership.
    let knowledge = [];
    if (Array.isArray(agent.knowledge_source_ids) && agent.knowledge_source_ids.length > 0) {
      knowledge = await base44.entities.KnowledgeSource.filter(
        { id: { $in: agent.knowledge_source_ids }, is_active: true, status: 'ready' }
      );
    }

    // Per-agent message history — user-scoped read.
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

    // Assemble the prompt: persona + voice + instructions + expertise +
    // knowledge, then bounded history, then the new message.
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

User: ${message}

Respond as ${agent.name} directly, without prefixing your name.`;

    // Server-side LLM call only.
    const llmResponse = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    const content = typeof llmResponse === 'string'
      ? llmResponse
      : (llmResponse?.content || String(llmResponse || ''));

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

    return Response.json({ content });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}