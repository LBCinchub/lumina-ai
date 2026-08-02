import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

const MOTHER_NODE_URL = "https://api.lbc.network/v1/deploy";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { bundle = {} } = await req.json();

    const states = await base44.asServiceRole.entities.LuminaState.list();
    const state = states[0];
    const timestamp = Date.now();

    const manifest = {
      bundle,
      timestamp,
      origin: "lbchub.site",
      version: state?.version || "1.0.0"
    };

    const signature = await signVpsPayload(manifest);
    if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    const response = await fetch(MOTHER_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LBC-Signature': signature,
        'X-LBC-Timestamp': timestamp.toString()
      },
      body: JSON.stringify(manifest)
    });

    if (!response.ok) {
      if (state) {
        const debt = [...(state.technical_debt || []), `Deployment_Failed: MOTHER_NODE_REJECTION_${timestamp}`];
        await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
      }
      return Response.json({ success: false, error: 'Deployment_Rejected_By_Mother_Node' });
    }

    const result = await response.json();

    if (state) {
      const goals = (state.active_goals || []).filter(g => g !== 'Deploy_Protocol_v2');
      const debt = [...(state.technical_debt || []), `SUCCESS: Protocol_Deployed_${timestamp}`];
      await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals, technical_debt: debt });
    }

    return Response.json({ success: true, deploymentId: result?.id || `LBC-${timestamp}` });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});