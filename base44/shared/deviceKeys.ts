// Pure helpers for LBC AI device verification. Shared between the
// registerOrVerifyDevice function and its tests so the invariants are pinned:
// only the SHA-256 hash is ever stored, names derive from the hash (never the
// raw key), and a revoked device can never re-verify.

export const MIN_KEY_LENGTH = 16;

// Trim untrusted input; the client sends a UUID but nothing larger is needed.
export function normalizeDeviceKey(raw) {
  return typeof raw === "string" ? raw.trim() : "";
}

// SHA-256 hex hash of the device key — the only value ever stored or compared.
export async function hashDeviceKey(rawKey) {
  const data = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Device name suffix comes from the hash — never from the raw key.
export function deviceSuffixFromHash(hash, len = 4) {
  return hash.slice(0, len).toUpperCase();
}

// First 8 characters of the raw key, shown once to the enrolling user.
export function confirmationCode(rawKey, len = 8) {
  return rawKey.slice(0, len).toUpperCase();
}

// Maps a found (or absent) device record to the verification outcome.
// A revoked device is never re-verified — it must enroll as a new device.
export function resolveVerification(match) {
  if (!match) return { verified: false, revoked: false, enrolled: true };
  if (match.status === "Active") return { verified: true, revoked: false, enrolled: false };
  return { verified: false, revoked: true, enrolled: false };
}

// The record created on first enrollment. Contains only the hash and dates —
// no raw key, no hardware identifiers.
export function buildEnrollmentRecord(keyHash, today) {
  return {
    device_name: `Device ${deviceSuffixFromHash(keyHash)}`,
    key_hash: keyHash,
    status: "Active",
    first_seen: today,
    last_seen: today,
  };
}

// True if the raw key (or its confirmation prefix) appears anywhere in a
// persisted/logged object. Used to prove hash-only storage.
export function containsRawKey(obj, rawKey) {
  if (!rawKey || !obj) return false;
  const json = JSON.stringify(obj).toLowerCase();
  return json.includes(rawKey.toLowerCase()) ||
    json.includes(confirmationCode(rawKey).toLowerCase());
}