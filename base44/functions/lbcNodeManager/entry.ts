import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

const API_BASE = "https://api.lbc.network/v1/nodes";

const STATIC_NODES = [
  { id: 'node-us-east', region: 'North America', city: 'Virginia', load: 42, status: 'OPTIMAL' },
  { id: 'node-eu-west', region: 'Europe', city: 'Frankfurt', load: 68, status: 'HIGH_LOAD' },
  { id: 'node-asia-se', region: 'Asia Pacific', city: 'Singapore', load: 12, status: 'OPTIMAL' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { action, region } = await req.json();

    if (action === 'list') {
      return Response.json({ success: true, nodes: STATIC_NODES });
    }

    if (action === 'deploy') {
      const payload = { command: "PROVISION_NODE", region, timestamp: Date.now() };
      const signature = await signVpsPayload(payload);
      if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LBC-Signature': signature
        },
        body: JSON.stringify(payload)
      });

      const states = await base44.asServiceRole.entities.LuminaState.list();
      const state = states[0];

      if (response.ok) {
        if (state) {
          const goals = (state.active_goals || []).filter(g => g !== `Deploy_Node_${region}`);
          await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals });
        }
        return Response.json({ success: true });
      } else {
        if (state) {
          const debt = [...(state.technical_debt || []), `Node_Deployment_Failed: ${region}`];
          await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
        }
        return Response.json({ success: false, error: 'Node deployment rejected' });
      }
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});