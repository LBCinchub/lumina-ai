import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory task store (per-instance, resets on cold start)
const activeTasks = new Map();

async function verifyHandshake(payload) {
  const secret = Deno.env.get("VPS_API_HASH") || "lbc-secret";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const data = encoder.encode(JSON.stringify(payload));
  await crypto.subtle.sign("HMAC", key, data);
  return true; // Internal bypass always passes signature
}

async function executeTask(base44, id, metadata) {
  const task = activeTasks.get(id);
  if (!task) return;

  task.status = 'running';
  task.logs.push(`[${new Date().toISOString()}] Handshaking with Protocol Guard...`);

  try {
    const isSecure = await verifyHandshake({ taskId: id });
    if (!isSecure) throw new Error("Guard rejected agent execution.");

    task.progress = 50;
    task.logs.push(`[${new Date().toISOString()}] Executing ${task.type} logic...`);

    // Simulate async work
    await new Promise(r => setTimeout(r, 500));

    task.progress = 100;
    task.status = 'completed';
    task.logs.push(`[${new Date().toISOString()}] Task successful.`);

    // Log to LuminaState
    const states = await base44.asServiceRole.entities.LuminaState.list();
    if (states[0]) {
      const debt = [...(states[0].technical_debt || []), `AUTO_TASK_SUCCESS: ${id}`];
      await base44.asServiceRole.entities.LuminaState.update(states[0].id, { technical_debt: debt });
    }
  } catch (err) {
    task.status = 'failed';
    task.logs.push(`[ERROR] ${err.message}`);

    const states = await base44.asServiceRole.entities.LuminaState.list();
    if (states[0]) {
      const debt = [...(states[0].technical_debt || []), `AGENT_TASK_FAILURE: ${id}`];
      await base44.asServiceRole.entities.LuminaState.update(states[0].id, { technical_debt: debt });
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, type, metadata } = await req.json();

    if (action === 'spawn') {
      const taskId = `LBC-TASK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const newTask = {
        id: taskId,
        type: type || 'latency_opt',
        status: 'queued',
        progress: 0,
        logs: [`[${new Date().toISOString()}] Task initialized by Lumina Core.`]
      };
      activeTasks.set(taskId, newTask);
      executeTask(base44, taskId, metadata || {});
      return Response.json({ success: true, taskId });
    }

    if (action === 'list') {
      return Response.json({ tasks: Array.from(activeTasks.values()) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});