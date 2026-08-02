import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

const NETWORK_REGISTRY = {
  mother_node: "https://api.lbc.network/v1/deploy",
  sister_hub: "https://lbc-hub.com/api/v1/sync",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { target = 'mother_node', payload = {} } = await req.json();

    const pkg = { target, payload, timestamp: Date.now() };
    const signature = await signVpsPayload(pkg);
    if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });
    const endpoint = NETWORK_REGISTRY[target];

    if (!endpoint) return Response.json({ error: 'Unknown target' }, { status: 400 });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LBC-Signature': signature,
        'X-LBC-Deployment-Origin': 'lbchub.site'
      },
      body: JSON.stringify(pkg)
    });

    const states = await base44.asServiceRole.entities.LuminaState.list();
    const state = states[0];

    if (!response.ok) {
      if (state) {
        const debt = [...(state.technical_debt || []), `Deployment_Critical_Error: ${response.statusText}`];
        await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
      }
      return Response.json({ success: false, error: `DEPLOY_FAILED: ${response.statusText}` });
    }

    if (state) {
      const goals = (state.active_goals || []).filter(g => g !== `Deploy_${target}`);
      await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});