import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWIN_ENDPOINT = "https://lbc-hub.com/api/v1/health";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Get or create Lumina state
    const states = await base44.asServiceRole.entities.LuminaState.list();
    let state = states[0];
    if (!state) {
      state = await base44.asServiceRole.entities.LuminaState.create({
        version: '1.0.0',
        active_goals: ['Initialize_System'],
        technical_debt: []
      });
    }

    try {
      const response = await fetch(TWIN_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-LBC-Origin': 'lbchub.site',
          'X-LBC-Signature': 'LUMINA_ALPHA_SYNC'
        }
      });

      const latency = Date.now() - startTime;

      if (!response.ok) throw new Error(`SISTER_HUB_OFFLINE: ${response.status}`);

      const data = await response.json();

      // Remove alignment goal on success
      const updatedGoals = (state.active_goals || []).filter(g => g !== 'Sister_Hub_Alignment');
      await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: updatedGoals });

      return Response.json({
        success: true,
        payload: {
          connected: true,
          version: data.version || '2.0.4',
          heartbeat: latency,
          activeNodes: data.nodes || 12
        },
        latency
      });

    } catch (error) {
      // Log failure to technical debt
      const updatedDebt = [...(state.technical_debt || []), `Alignment_Failed: ${error.message}`];
      await base44.asServiceRole.entities.LuminaState.update(state.id, {
        technical_debt: updatedDebt.slice(-50)
      });

      return Response.json({ success: false, error: error.message, latency: Date.now() - startTime });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});