import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SECRET = Deno.env.get("LBC_INTERNAL_SECRET") || "fallback_dev_secret";

async function signRequest(payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = encoder.encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyHandshake(payload, signature) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const data = encoder.encode(JSON.stringify(payload));
  const sigArray = new Uint8Array(atob(signature).split("").map(c => c.charCodeAt(0)));
  return await crypto.subtle.verify("HMAC", key, sigArray, data);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, payload, signature } = await req.json();

    if (action === 'sign') {
      if (!payload) return Response.json({ error: 'payload required' }, { status: 400 });
      const sig = await signRequest(payload);
      return Response.json({ success: true, signature: sig });
    }

    if (action === 'hardware_auth') {
      const { serial, ip } = await req.json().catch(() => ({}));
      const MASTER_SERIAL = "R52W507LWCR";
      const MASTER_IP = "10.88.111.2";
      const authorized = serial === MASTER_SERIAL && ip === MASTER_IP;

      if (authorized) {
        const states = await base44.asServiceRole.entities.LuminaState.list();
        const state = states[0];
        if (state) {
          const goals = (state.active_goals || []).filter(g => g !== 'Hardware_Node_Registration');
          await base44.asServiceRole.entities.LuminaState.update(state.id, { active_goals: goals });
        }
      }

      return Response.json({ success: true, authorized, device: authorized ? "SM-X900_MASTER_NODE" : null });
    }

    if (action === 'verify') {
      if (!payload || !signature) return Response.json({ error: 'payload and signature required' }, { status: 400 });
      const isValid = await verifyHandshake(payload, signature);
      if (!isValid) {
        const states = await base44.asServiceRole.entities.LuminaState.list();
        if (states.length > 0) {
          const state = states[0];
          const debt = [...(state.technical_debt || []), `SECURITY_ALERT: Unauthorized_Handshake_Attempt @ ${new Date().toISOString()}`];
          await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
        }
      }
      return Response.json({ success: true, valid: isValid });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});