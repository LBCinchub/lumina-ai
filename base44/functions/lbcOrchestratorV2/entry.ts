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

    const signature = await signRequest(manifest);

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
    return Response.json({ error: error.message }, { status: 500 });
  }
});