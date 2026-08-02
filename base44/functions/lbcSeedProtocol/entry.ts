import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { ip } = await req.json();
    if (!ip) return Response.json({ error: 'Missing target IP' }, { status: 400 });

    const signature = await signVpsPayload({ action: "NODE_INITIALIZATION", target: ip });
    if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    // Simulated provisioning (hooks into VPS infrastructure)
    const nodeId = `LBC-NODE-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Update LuminaState goals
    const states = await base44.asServiceRole.entities.LuminaState.list();
    const state = states[0];
    if (state) {
      const goals = [...(state.active_goals || []), `Expansion: ${ip}`];
      await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals });
    }

    return Response.json({ status: "NODE_LIVE", nodeId, signature });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});