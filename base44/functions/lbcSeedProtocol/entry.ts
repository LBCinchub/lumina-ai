import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function signRequest(payload) {
  const secret = Deno.env.get("VPS_API_HASH") || "lbc-secret";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(payload)));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ip } = await req.json();
    if (!ip) return Response.json({ error: 'Missing target IP' }, { status: 400 });

    const signature = await signRequest({ action: "NODE_INITIALIZATION", target: ip });

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
    return Response.json({ error: error.message }, { status: 500 });
  }
});