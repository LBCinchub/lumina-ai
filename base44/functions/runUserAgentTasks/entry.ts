import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  MAX_HISTORY_MESSAGES,
  runAgentTurn,
  isTaskDue,
} from '../../shared/userAgents.ts';
import { deliverViaSuperagent } from '../../shared/superagentBridge.ts';

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
//  - When the agent is connected to the user's Superagent, the result is
//    delivered to their phone in addition to the agent's chat history.
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
        const history = await service.entities.UserAgentMessage.filter(
          { agent_id: agent.id }, 'created_date', MAX_HISTORY_MESSAGES
        ).catch(() => []);

        result = await runAgentTurn(service, agent, {
          history,
          taskName: task.name,
          taskInstruction: task.instruction,
        });
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

      // Deliver to the user's phone through their Superagent when connected.
      // Honest and never fatal to the run — the result is already stored.
      await deliverViaSuperagent(service, agent.id, historyContent);

      ran++;
    }

    return Response.json({ ok: true, ran, skipped });
  } catch (_) {
    return Response.json({ ok: false }, { status: 500 });
  }
}