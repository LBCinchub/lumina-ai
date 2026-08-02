import { secrets } from "base44:runtime";

// HMAC-SHA256 hex signature using VPS_API_HASH. Returns null when the secret is
// unavailable so callers fail closed (503) instead of signing with a fallback.
export async function signVpsPayload(payload) {
  const secret = secrets.get("VPS_API_HASH");
  if (!secret) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(payload)));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// VPS panel credentials for vpsControl / luminaVpsTool. Null when unavailable.
export function getVpsCreds() {
  const key = secrets.get("VPS_API_KEY");
  const hash = secrets.get("VPS_API_HASH");
  if (!key || !hash) return null;
  return { key, hash };
}