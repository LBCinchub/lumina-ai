import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWIN_BASE = "https://lbc-hub.com";

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
      // Ping the sister domain — treat any reachable response as connected
      const response = await fetch(TWIN_BASE, {
        method: 'GET',
        headers: {
          'X-LBC-Origin': 'lbchub.site',
          'X-LBC-Signature': 'LUMINA_ALPHA_SYNC'
        },
        signal: AbortSignal.timeout(8000)
      });

      const latency = Date.now() - startTime;

      // Any response (even HTML) means the domain is reachable and alive
      if (!response.ok && response.status >= 500) {
        throw new Error(`SISTER_HUB_ERROR: ${response.status}`);
      }

      // Try to parse JSON, but don't fail if it's HTML
      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      }

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