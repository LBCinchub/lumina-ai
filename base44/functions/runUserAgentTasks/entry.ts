import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  MAX_HISTORY_MESSAGES,
  MAX_HISTORY_CHARS_PER_MSG,
  buildAgentSystemPrompt,
  isTaskDue,
  decryptBotToken,
} from '../../shared/userAgents.ts';

// Scheduled Autopilot runner: executes due enabled tasks for user-built
// agents. Invoked every 15 minutes by the Agent Autopilot Runner workflow.
//
// Security model:
//  - Runs server-side with the service role; every task verifies that the
//    task and its agent carry the SAME server-stamped owner_email before
//    anything executes. Mismatched or unowned records are skipped.
//  - Each due window fires exactly once (guarded by last_run_at), so
//    repeated invocation cannot re-run a task or burn extra credits.
//  - Authenticated non-admins are rejected; the workflow invokes without a
//    user session. All AI runs server-side only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Block direct invocation by authenticated non-admins.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = base44.asServiceRole;
    const now = new Date();

    const tasks = await service.entities.UserAgentTask.filter(
      { enabled: true }, 'created_date', 100
    ).catch(() => []);

    let ran = 0;
    let skipped = 0;

    for (const task of tasks || []) {
      if (!isTaskDue(task, now)) continue;

      const ownerEmail = task.owner_email || '';
      if (!ownerEmail) { skipped++; continue; }

      let agents = [];
      try {
        agents = await service.entities.UserAgent.filter({ id: task.agent_id });
      } catch (_) {}
      const agent = agents && agents[0];

      // Ownership verification: the task and the agent must carry the same
      // server-stamped owner. Never execute a mismatched pair.
      if (!agent || agent.owner_email !== ownerEmail || agent.status === 'archived') {
        skipped++;
        try {
          await service.entities.UserAgentTask.update(task.id, { last_run_at: now.toISOString() });
        } catch (_) {}
        continue;
      }

      // Mark the run immediately so the window fires exactly once.
      try {
        await service.entities.UserAgentTask.update(task.id, { last_run_at: now.toISOString() });
      } catch (_) {}

      let result = '';
      try {
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

AUTOMATED TASK: "${task.name}" — the user scheduled this task to run now.
TASK INSTRUCTION: ${task.instruction}

Complete the task for the user directly, without prefixing your name.`;

        const llmResponse = await service.integrations.Core.InvokeLLM({ prompt: fullPrompt });
        result = typeof llmResponse === 'string' ? llmResponse : (llmResponse && llmResponse.content) || '';
      } catch (_) {
        result = '';
      }

      if (!result) {
        try {
          await service.entities.UserAgentTask.update(task.id, {
            last_result: 'The last run could not complete. It will try again on the next scheduled run.',
          });
        } catch (_) {}
        skipped++;
        continue;
      }

      // Store the result and append it to the agent's chat history as an
      // agent message, with the task's server-stamped ownership.
      const historyContent = `🤖 Autopilot — ${task.name}\n\n${result}`;
      try {
        await service.entities.UserAgentMessage.create({
          agent_id: agent.id,
          role: 'assistant',
          content: historyContent,
          owner_email: ownerEmail,
          ownership_state: 'human_verified',
        });
      } catch (_) {}
      try {
        await service.entities.UserAgentTask.update(task.id, { last_result: result.slice(0, 2000) });
      } catch (_) {}

      // Deliver to Telegram when the agent is connected.
      try {
        const conns = await service.entities.UserAgentConnection.filter(
          { agent_id: agent.id, channel: 'telegram', status: 'connected' }
        );
        const conn = conns && conns[0];
        if (conn && conn.chat_id) {
          let token = '';
          try {
            token = await decryptBotToken(conn.token_encrypted);
          } catch (_) {}
          if (token) {
            await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: conn.chat_id, text: historyContent.slice(0, 4000) }),
            });
          }
        }
      } catch (_) {}

      ran++;
    }

    return Response.json({ ok: true, ran, skipped });
  } catch (_) {
    return Response.json({ ok: false }, { status: 500 });
  }
}