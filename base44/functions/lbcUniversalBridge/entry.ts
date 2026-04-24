import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MOTHER_NODE_URL = 'https://lbc.network';

async function hmacHex(secret, data) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateFamilyToken(userId, targetDomain, secret) {
  const timestamp = Date.now();
  const payload = `${userId}:${targetDomain}:${timestamp}`;
  const signature = await hmacHex(secret, payload);
  return btoa(`${payload}:${signature}`);
}

async function verifyFamilyToken(token, currentDomain, secret) {
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts.length < 4) return { valid: false, error: 'Malformed token' };

    const [userId, targetDomain, timestamp, signature] = parts;

    if (targetDomain !== currentDomain) return { valid: false, error: 'Domain mismatch' };
    if (Date.now() - parseInt(timestamp) > 60000) return { valid: false, error: 'Token expired' };

    const expectedSignature = await hmacHex(secret, `${userId}:${targetDomain}:${timestamp}`);
    if (signature !== expectedSignature) return { valid: false, error: 'Invalid signature' };

    return { valid: true, userId };
  } catch {
    return { valid: false, error: 'Malformed token' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const secret = Deno.env.get("VPS_API_HASH") || "lbc-secret";
    const { action, userId, targetDomain, currentDomain, token } = await req.json();

    if (action === 'generate') {
      if (!userId || !targetDomain) return Response.json({ error: 'userId and targetDomain required' }, { status: 400 });
      const familyToken = await generateFamilyToken(userId, targetDomain, secret);
      return Response.json({ success: true, token: familyToken, motherNode: MOTHER_NODE_URL });
    }

    if (action === 'verify') {
      if (!token || !currentDomain) return Response.json({ error: 'token and currentDomain required' }, { status: 400 });
      const result = await verifyFamilyToken(token, currentDomain, secret);
      return Response.json({ success: true, ...result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});