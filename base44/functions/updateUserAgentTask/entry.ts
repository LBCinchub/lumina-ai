import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { AGENT_TASK_ACTIVE_LIMIT, sanitizeTaskInput } from '../../shared/userAgents.ts';

// Updates one of the user's Autopilot tasks.
//
// Security model:
//  - The task is resolved with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign task id returns nothing → 404.
//  - Re-enabling a task re-enforces the free-tier active-task limit.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body.task_id === 'string' ? body.task_id : '';
    if (!taskId) return Response.json({ error: 'Missing task_id' }, { status: 400 });

    // RLS-verified ownership.
    let tasks = [];
    try {
      tasks = await base44.entities.UserAgentTask.filter({ id: taskId });
    } catch (_) {}
    const task = tasks && tasks[0];
    if (!task) return Response.json({ error: 'Not found' }, { status: 404 });

    const sanitized = sanitizeTaskInput(body, { partial: true });
    if (sanitized.error) return Response.json({ error: sanitized.error }, { status: 400 });
    const fields = sanitized.fields;

    // Free-tier limit when (re-)enabling.
    if (fields.enabled === true && !task.enabled) {
      const enabledTasks = await base44.entities.UserAgentTask.filter(
        { agent_id: task.agent_id, enabled: true }
      ).catch(() => []);
      if ((enabledTasks || []).length >= AGENT_TASK_ACTIVE_LIMIT) {
        return Response.json(
          {
            error: `Free plan limit reached: ${AGENT_TASK_ACTIVE_LIMIT} active autopilot tasks per agent. Disable a task first.`,
            limit: AGENT_TASK_ACTIVE_LIMIT,
          },
          { status: 409 }
        );
      }
    }

    const updated = await base44.entities.UserAgentTask.update(taskId, fields);
    return Response.json({ task: updated });
  } catch (_) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}