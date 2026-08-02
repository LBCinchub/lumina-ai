import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

const MOTHER_NODE_URL = "https://api.lbc.network/v1/deploy";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { buildArtifact } = await req.json();
    const timestamp = Date.now();

    const signature = await signVpsPayload({ ...buildArtifact, timestamp, origin: "lbchub.site" });
    if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });

    const response = await fetch(MOTHER_NODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LBC-Signature': signature,
        'X-LBC-Deployment-ID': `LBC-${timestamp}`
      },
      body: JSON.stringify(buildArtifact)
    });

    const states = await base44.asServiceRole.entities.LuminaState.list();
    const state = states[0];

    if (!response.ok) {
      if (state) {
        const debt = [...(state.technical_debt || []), `DEPLOY_FAILURE: MOTHER_NODE_REJECTION_${timestamp}`];
        await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
      }
      return Response.json({ success: false, error: 'MOTHER_NODE_REJECTION' });
    }

    if (state) {
      const goals = (state.active_goals || []).filter(g => g !== "Automated_Deployment_Pipeline");
      const debt = [...(state.technical_debt || []), `SUCCESS: Deployed_Build_${timestamp}`];
      await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals, technical_debt: debt });
    }

    return Response.json({ success: true, deploymentId: `LBC-${timestamp}` });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});