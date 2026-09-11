import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { AGENT_TASK_ACTIVE_LIMIT, sanitizeTaskInput } from '../../shared/userAgents.ts';

// Creates an Autopilot task for one of the user's agents.
//
// Security model:
//  - The agent and existing tasks are resolved with the USER-SCOPED client, so
//    RLS verifies ownership: a foreign agent id returns nothing → 404.
//  - owner_email + ownership_state are stamped from the authenticated session.
//  - Free-tier limit: at most AGENT_TASK_ACTIVE_LIMIT enabled tasks per agent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

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
    if (agent.status === 'archived') {
      return Response.json({ error: 'This agent is archived' }, { status: 403 });
    }

    const sanitized = sanitizeTaskInput(body, { partial: false });
    if (sanitized.error) return Response.json({ error: sanitized.error }, { status: 400 });
    const fields = sanitized.fields;

    // Free-tier limit: count this agent's enabled tasks.
    const enabledTasks = await base44.entities.UserAgentTask.filter(
      { agent_id: agentId, enabled: true }
    ).catch(() => []);
    if ((enabledTasks || []).length >= AGENT_TASK_ACTIVE_LIMIT) {
      return Response.json(
        {
          error: `Free plan limit reached: ${AGENT_TASK_ACTIVE_LIMIT} active autopilot tasks per agent. Disable a task to add another.`,
          limit: AGENT_TASK_ACTIVE_LIMIT,
        },
        { status: 409 }
      );
    }

    const task = await base44.entities.UserAgentTask.create({
      agent_id: agentId,
      owner_email: user.email,
      ownership_state: 'human_verified',
      name: fields.name,
      schedule_type: fields.schedule_type,
      ...(fields.schedule_weekday !== undefined ? { schedule_weekday: fields.schedule_weekday } : {}),
      schedule_time: fields.schedule_time,
      instruction: fields.instruction,
      enabled: true,
    });

    return Response.json({ task });
  } catch (_) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}