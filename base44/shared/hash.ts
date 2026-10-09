// Pure hashing + token primitives. Kept separate from security.ts so modules
// that must run in plain runtimes (deterministic tests) can import them
// without pulling in base44:runtime. security.ts re-exports these.
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, "0")).join("");
}