import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOTHER_NODE_URL = "https://api.lbc.network/v1/deploy";

async function signRequest(payload) {
  const secret = Deno.env.get("VPS_API_HASH") || "lbc-secret";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const data = encoder.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { buildArtifact } = await req.json();
    const timestamp = Date.now();

    const signature = await signRequest({ ...buildArtifact, timestamp, origin: "lbchub.site" });

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
    return Response.json({ error: error.message }, { status: 500 });
  }
});