import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory thread store (resets on cold start)
const activeThreads = new Map();

async function executeTask(base44, id) {
  const thread = activeThreads.get(id);
  if (!thread) return;

  for (let i = 10; i <= 100; i += 10) {
    await new Promise(r => setTimeout(r, 800));
    thread.progress = i;
    if (i === 100) thread.status = 'completed';
  }

  // Remove from LuminaState goals on completion
  try {
    const states = await base44.asServiceRole.entities.LuminaState.list();
    if (states[0]) {
      const goals = (states[0].active_goals || []).filter(g => !g.startsWith(`Thread_${id}`));
      await base44.asServiceRole.entities.LuminaState.update(states[0].id, { active_goals: goals });
    }
  } catch (_) {}
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, task } = await req.json();

    if (action === 'spawn') {
      const id = Math.random().toString(36).substr(2, 8).toUpperCase();
      const newThread = { id, task: task || 'generic_task', status: 'active', progress: 0 };
      activeThreads.set(id, newThread);

      // Track in LuminaState
      try {
        const states = await base44.asServiceRole.entities.LuminaState.list();
        if (states[0]) {
          const goals = [...(states[0].active_goals || []), `Thread_${id}: ${task}`];
          await base44.asServiceRole.entities.LuminaState.update(states[0].id, { active_goals: goals });
        }
      } catch (_) {}

      // Execute in background (fire and forget)
      executeTask(base44, id);

      return Response.json({ success: true, threadId: id });
    }

    if (action === 'list') {
      return Response.json({ threads: Array.from(activeThreads.values()) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});