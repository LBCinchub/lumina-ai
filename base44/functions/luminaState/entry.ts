import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_STATE = {
  version: "1.0.0",
  last_refactor: new Date().toISOString(),
  active_goals: ["Establish Persistence", "Switch to SSE for Telemetry"],
  technical_debt: ["Fix WebSocket overreach", "Implement real-time state sync"]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, goal, status, issue } = body;

    // Get or bootstrap the singleton state record
    const records = await base44.asServiceRole.entities.LuminaState.list();
    let record = records[0];

    if (!record) {
      record = await base44.asServiceRole.entities.LuminaState.create(DEFAULT_STATE);
    }

    let updated;
    switch (action) {
      case 'get':
        return Response.json({ success: true, state: record });

      case 'update_goal': {
        if (!goal || !status) return Response.json({ error: 'Missing goal or status' }, { status: 400 });
        let goals = record.active_goals || [];
        if (status === 'add') {
          if (!goals.includes(goal)) goals = [...goals, goal];
        } else {
          goals = goals.filter(g => g !== goal);
        }
        updated = await base44.asServiceRole.entities.LuminaState.update(record.id, { active_goals: goals });
        return Response.json({ success: true, state: updated });
      }

      case 'log_correction': {
        if (!issue) return Response.json({ error: 'Missing issue' }, { status: 400 });
        const debt = [...(record.technical_debt || []), `${Date.now()}: ${issue}`];
        updated = await base44.asServiceRole.entities.LuminaState.update(record.id, { technical_debt: debt });
        return Response.json({ success: true, state: updated });
      }

      case 'reset':
        updated = await base44.asServiceRole.entities.LuminaState.update(record.id, {
          ...DEFAULT_STATE,
          last_refactor: new Date().toISOString()
        });
        return Response.json({ success: true, state: updated });

      default:
        return Response.json({ error: 'Unknown action. Use: get, update_goal, log_correction, reset' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});