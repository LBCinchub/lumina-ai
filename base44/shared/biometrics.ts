// Shared WebAuthn (Face ID / Touch ID) primitives for LBC AI Ultra.
//
// SECURITY MODEL:
//  - Only the credential's PUBLIC KEY is ever stored. Biometric data, face
//    data, and images never leave the device — the browser's standard
//    WebAuthn API releases just a public key and per-use signatures.
//  - Challenges are issued and consumed SERVER-SIDE as single-use expiring
//    tokens bound to the authenticated user (and, for assertions, to the
//    exact action being confirmed). Replay and cross-user use fail closed.
//  - Assertion signatures are verified server-side against the stored
//    public key: signature, challenge match, sign counter, origin, RP ID.
//    Client "verified" flags are never trusted.
//  - All BiometricCredential reads and writes run through the user-scoped
//    client, so RLS keeps user A from ever seeing or verifying against
//    user B's credentials.
//  - Face ID is an added layer, never a lockout: with zero Active
//    credentials everything works with the standard session.

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@13.1.0";
import { issueConfirmation, verifyConfirmation, sha256Hex } from "./security.ts";

export const RP_NAME = "LBC AI Ultra";
export const CHALLENGE_TTL_SECONDS = 300; // 5 minutes
export const ENROLLMENT_ACTION = "faceid_enrollment";
export const ASSERTION_ACTION = "faceid_assertion";

// --- RP / origin validation --------------------------------------------------

// Hosts the app is actually served from. The WebAuthn RP ID is the site's
// own hostname, and the browser embeds the real page origin into the signed
// client data — so only these hosts can ever pass verification.
const ALLOWED_HOST_PATTERNS = [
  /^[\w-]+\.base44\.app$/, // the app's platform + preview domains
  /^localhost(:\d+)?$/,
  /^127\.0\.0\.1(:\d+)?$/,
];
const ALLOWED_HOSTS = new Set([
  "lbchub.site",
  "www.lbchub.site",
  "lbc-hub.com",
  "www.lbc-hub.com",
]);

export function isAllowedRpHost(host) {
  if (!host || typeof host !== "string") return false;
  const h = host.toLowerCase().trim();
  return ALLOWED_HOSTS.has(h) || ALLOWED_HOST_PATTERNS.some((re) => re.test(h));
}

// Resolve the WebAuthn RP from the request itself (Origin/Referer header),
// falling back to the client-reported hostname — validated against the
// allowlist either way. Returns null when nothing allowed can be resolved.
export function resolveRp(req, clientRpId) {
  const candidates = [];
  try {
    const header = (req.headers.get("origin") || req.headers.get("referer") || "").trim();
    if (header) {
      const u = new URL(header);
      candidates.push({ host: u.hostname, origin: u.origin });
    }
  } catch (_) {}
  if (isAllowedRpHost(clientRpId)) {
    const host = String(clientRpId).toLowerCase().trim();
    candidates.push({ host, origin: `https://${host}` });
  }
  const found = candidates.find((c) => isAllowedRpHost(c.host));
  return found ? { rpId: found.host, expectedOrigin: found.origin } : null;
}

// --- Helpers ------------------------------------------------------------------

export function normalizeLabel(raw, fallback = "My Device") {
  const s = typeof raw === "string"
    ? raw.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 40)
    : "";
  return s || fallback;
}

export function toBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(str) {
  let b64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function listActiveCredentials(base44) {
  try {
    return await base44.entities.BiometricCredential.filter({ status: "Active" });
  } catch (_) {
    return [];
  }
}

// --- Challenges (single-use, expiring, user-bound) ------------------------------

async function expirePending(db, filter) {
  try {
    await db.entities.AiActionConfirmation.updateMany(
      { ...filter, status: "pending" },
      { $set: { status: "expired" } }
    );
  } catch (_) {}
}

// The raw challenge doubles as the confirmation token: it is stored only as
// a SHA-256 hash, expires in 5 minutes, and is consumed exactly once.
export async function issueEnrollmentChallenge(db, user) {
  // One active enrollment challenge per user — older pending ones expire now.
  await expirePending(db, { actor_email: user.email, action_type: ENROLLMENT_ACTION });
  return issueConfirmation(db, {
    actorEmail: user.email,
    actionType: ENROLLMENT_ACTION,
    target: user.id,
    payloadHash: await sha256Hex(`${ENROLLMENT_ACTION}|${user.id}`),
    ttlSeconds: CHALLENGE_TTL_SECONDS,
  });
}

export async function assertionPayloadHash(user, action) {
  return sha256Hex(`${ASSERTION_ACTION}|${user.id}|${action}`);
}

export async function issueAssertionChallenge(db, user, action) {
  // One active challenge per user+action — older pending ones expire now.
  const payloadHash = await assertionPayloadHash(user, action);
  await expirePending(db, {
    actor_email: user.email,
    action_type: ASSERTION_ACTION,
    payload_hash: payloadHash,
  });
  return issueConfirmation(db, {
    actorEmail: user.email,
    actionType: ASSERTION_ACTION,
    target: user.id,
    payloadHash,
    ttlSeconds: CHALLENGE_TTL_SECONDS,
  });
}

// --- WebAuthn option builders ---------------------------------------------------

export function buildRegistrationOptions(user, rp, challenge, excludeCredentials) {
  const options = generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpId,
    userID: new TextEncoder().encode(user.id),
    userName: user.email,
    attestationType: "none",
    excludeCredentials: excludeCredentials || [],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
    timeout: CHALLENGE_TTL_SECONDS * 1000,
  });
  options.challenge = challenge; // single-use server-issued challenge
  return options;
}

export function buildAuthenticationOptions(rp, challenge, allowCredentials) {
  const options = generateAuthenticationOptions({
    rpID: rp.rpId,
    timeout: CHALLENGE_TTL_SECONDS * 1000,
    userVerification: "required",
    allowCredentials: allowCredentials || [],
  });
  options.challenge = challenge; // single-use server-issued challenge
  return options;
}

// --- Verification (server-side, fail closed) ------------------------------------

// Verifies a registration result against the user's live enrollment
// challenge. Returns { ok, credential: { credentialId, publicKeyB64,
// counter } } — never any biometric data (there is none to return).
export async function verifyEnrollment(db, user, rp, registration) {
  if (!rp) return { ok: false, error: "invalid_rp" };
  let clientData = null;
  try {
    clientData = JSON.parse(new TextDecoder().decode(fromBase64Url(registration?.response?.clientDataJSON)));
  } catch (_) {}
  const challenge = clientData?.challenge;
  if (!challenge) return { ok: false, error: "invalid_registration" };

  const consumed = await verifyConfirmation(db, {
    token: challenge,
    actorEmail: user.email,
    actionType: ENROLLMENT_ACTION,
    target: user.id,
    payloadHash: await sha256Hex(`${ENROLLMENT_ACTION}|${user.id}`),
  });
  if (!consumed.ok) return { ok: false, error: consumed.reason };

  let verification = null;
  try {
    verification = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge: challenge,
      expectedOrigin: rp.expectedOrigin,
      expectedRPID: rp.rpId,
      requireUserVerification: true,
    });
  } catch (_) {
    return { ok: false, error: "attestation_invalid" };
  }
  const credential = verification?.registrationInfo?.credential;
  if (!verification?.verified || !credential?.publicKey) {
    return { ok: false, error: "attestation_invalid" };
  }
  return {
    ok: true,
    credential: {
      credentialId: credential.id,
      publicKeyB64: toBase64Url(credential.publicKey),
      counter: credential.counter || 0,
    },
  };
}

// Full assertion verification: single-use challenge bound to (user + action),
// then signature, origin, RP ID, and sign counter checked against the stored
// public key. Only the owner's Active credentials can match (RLS-scoped read).
export async function verifyAssertion(base44, db, user, rp, action, assertion) {
  if (!rp) return { verified: false, error: "invalid_rp" };
  if (!action || typeof action !== "string" || action.length > 200) {
    return { verified: false, error: "invalid_action" };
  }
  let clientData = null;
  try {
    clientData = JSON.parse(new TextDecoder().decode(fromBase64Url(assertion?.response?.clientDataJSON)));
  } catch (_) {}
  const challenge = clientData?.challenge;
  if (!challenge) return { verified: false, error: "invalid_assertion" };

  const consumed = await verifyConfirmation(db, {
    token: challenge,
    actorEmail: user.email,
    actionType: ASSERTION_ACTION,
    target: user.id,
    payloadHash: await assertionPayloadHash(user, action),
  });
  if (!consumed.ok) return { verified: false, error: consumed.reason };

  // RLS-scoped lookup — only this user's Active credentials can ever match.
  let creds = [];
  try {
    creds = await base44.entities.BiometricCredential.filter({
      credential_id: assertion?.rawId || assertion?.id,
      status: "Active",
    });
  } catch (_) {}
  const cred = creds?.[0];
  if (!cred) return { verified: false, error: "credential_not_found" };

  let verification = null;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challenge,
      expectedOrigin: rp.expectedOrigin,
      expectedRPID: rp.rpId,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: fromBase64Url(cred.public_key),
        counter: cred.sign_count || 0,
      },
    });
  } catch (_) {
    return { verified: false, error: "signature_invalid" };
  }
  if (!verification?.verified) return { verified: false, error: "verification_failed" };

  // Advance the stored sign counter (replay protection) + last-used date.
  try {
    await base44.entities.BiometricCredential.update(cred.id, {
      sign_count: verification.authenticationInfo?.newCounter ?? cred.sign_count,
      last_used: new Date().toISOString().slice(0, 10),
    });
  } catch (_) {}
  return { verified: true, credential_id: cred.credential_id };
}

// --- Sensitive-action gate -------------------------------------------------------

// Gate for destructive actions. With zero Active credentials the standard
// authenticated session is the confirmation (never a lockout); otherwise a
// valid Face ID assertion for this exact action is required — verified
// server-side, never via a client flag.
export async function requireFaceIdGate(base44, db, user, rp, action, assertion) {
  const active = await listActiveCredentials(base44);
  if (!active || active.length === 0) return { ok: true, reason: "faceid_not_enrolled" };
  if (!assertion) return { ok: false, reason: "face_id_required" };
  const result = await verifyAssertion(base44, db, user, rp, action, assertion);
  if (!result.verified) {
    return { ok: false, reason: "verification_failed", error: result.error };
  }
  return { ok: true, reason: "face_id_verified" };
}

export function faceIdGateError(reason) {
  return reason === "face_id_required"
    ? "Face ID Verification Required"
    : "Face ID Verification Failed — Please Try Again";
}