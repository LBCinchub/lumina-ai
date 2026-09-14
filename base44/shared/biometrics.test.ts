// Unit tests for the LBC AI Face ID (WebAuthn) invariants.
// Run: deno test --allow-env --allow-read base44/shared/biometrics.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.13";
import { sha256Hex } from "./security.ts";
import {
  toBase64Url,
  fromBase64Url,
  normalizeLabel,
  assertionPayloadHash,
  verifyAssertion,
  requireFaceIdGate,
} from "./biometrics.ts";

// --- Test doubles ---------------------------------------------------------------

function stubApp(credentials) {
  return {
    entities: {
      BiometricCredential: {
        filter: async (q) =>
          (credentials || []).filter(
            (c) =>
              (!q.credential_id || c.credential_id === q.credential_id) &&
              (!q.status || c.status === q.status)
          ),
        update: async () => {},
      },
    },
  };
}

async function stubDb({ challenge, email, userId, action }) {
  const payloadHash = await assertionPayloadHash({ id: userId }, action);
  const tokenHash = await sha256Hex(challenge);
  return {
    entities: {
      AiActionConfirmation: {
        filter: async () => [
          {
            id: "conf1",
            token_hash: tokenHash,
            actor_email: email,
            action_type: "faceid_assertion",
            target: userId,
            payload_hash: payloadHash,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            status: "pending",
          },
        ],
        update: async () => {},
      },
    },
  };
}

// Real ES256 (P-256) keypair + a hand-built COSE public key — the exact
// shape a platform authenticator stores. No biometric material exists here.
async function makeCredential() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"]
  );
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const x = fromBase64Url(jwk.x);
  const y = fromBase64Url(jwk.y);
  // Canonical CBOR map(5): {1: 2, 3: -7, -1: 1, -2: x, -3: y}
  const cose = Uint8Array.from([
    0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01,
    0x21, 0x58, 0x20, ...x,
    0x22, 0x58, 0x20, ...y,
  ]);
  const credentialIdB64 = toBase64Url(new TextEncoder().encode("test-credential-id"));
  return { keyPair, coseB64: toBase64Url(cose), credentialIdB64 };
}

async function authenticatorData(rpId, signCount, flags = 0x05) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId))
  );
  const out = new Uint8Array(37);
  out.set(digest, 0);
  out[32] = flags; // UP | UV
  new DataView(out.buffer).setUint32(33, signCount);
  return out;
}

async function buildAssertion({
  challenge,
  action,
  keyPair,
  credentialIdB64,
  rpId = "localhost",
  origin = "https://localhost",
  signCount = 1,
  corruptSignature = false,
}) {
  const clientDataJSON = new TextEncoder().encode(
    JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false })
  );
  const authData = await authenticatorData(rpId, signCount);
  const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientDataJSON));
  const signed = new Uint8Array(authData.length + clientHash.length);
  signed.set(authData, 0);
  signed.set(clientHash, authData.length);
  let signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, signed)
  );
  if (corruptSignature) {
    signature[signature.length - 1] ^= 0xff;
  }
  return {
    id: credentialIdB64,
    rawId: credentialIdB64,
    type: "public-key",
    response: {
      clientDataJSON: toBase64Url(clientDataJSON),
      authenticatorData: toBase64Url(authData),
      signature: toBase64Url(signature),
    },
  };
}

const USER = { id: "user-1", email: "a@lbc-hub.com" };
const OTHER = { id: "user-2", email: "b@lbc-hub.com" };
const RP = { rpId: "localhost", expectedOrigin: "https://localhost" };
const ACTION = "Revoke Device device-1";

// --- Tests -----------------------------------------------------------------------

Deno.test("base64url round trip preserves key bytes", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(77));
  assertEquals(fromBase64Url(toBase64Url(bytes)), bytes);
});

Deno.test("assertion challenges bind to the user and the exact action", async () => {
  const a = await assertionPayloadHash(USER, ACTION);
  assertEquals(await assertionPayloadHash(USER, ACTION), a);
  assertEquals((await assertionPayloadHash(OTHER, ACTION)) === a, false);
  assertEquals((await assertionPayloadHash(USER, "Revoke Device device-2")) === a, false);
});

Deno.test("normalizeLabel: trims, strips control chars, caps length, falls back", () => {
  assertEquals(normalizeLabel("  iPhone  "), "iPhone");
  assertEquals(normalizeLabel("\u0000Bad\u007fLabel"), "BadLabel");
  assertEquals(normalizeLabel("x".repeat(80)).length, 40);
  assertEquals(normalizeLabel("   "), "My Device");
  assertEquals(normalizeLabel(null), "My Device");
});

Deno.test("assertion verifies server-side against the stored public key", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({ challenge, action: ACTION, keyPair, credentialIdB64 });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, assertion);
  assertEquals(result.verified, true);
});

Deno.test("a tampered challenge fails — challenges are single-use and user-bound", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const issued = "a".repeat(64);
  const tampered = await buildAssertion({
    challenge: "b".repeat(64), // attacker-substituted challenge
    action: ACTION, keyPair, credentialIdB64,
  });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const db = await stubDb({ challenge: issued, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, tampered);
  assertEquals(result.verified, false);
  assertEquals(result.error, "invalid");
});

Deno.test("a tampered signature fails server-side verification", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({
    challenge, action: ACTION, keyPair, credentialIdB64, corruptSignature: true,
  });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, assertion);
  assertEquals(result.verified, false);
});

Deno.test("a wrong origin fails — the RP origin is enforced", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({
    challenge, action: ACTION, keyPair, credentialIdB64, origin: "https://evil.example",
  });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, assertion);
  assertEquals(result.verified, false);
});

Deno.test("a regressed sign counter fails — replay protection holds", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({ challenge, action: ACTION, keyPair, credentialIdB64, signCount: 1 });
  const app = stubApp([
    // Stored counter already advanced to 5 — a counter of 1 is a replay signal.
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 5, status: "Active" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, assertion);
  assertEquals(result.verified, false);
});

Deno.test("a revoked credential can never assert", async () => {
  const { keyPair, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({ challenge, action: ACTION, keyPair, credentialIdB64 });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: "x", sign_count: 0, status: "Revoked" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const result = await verifyAssertion(app, db, USER, RP, ACTION, assertion);
  assertEquals(result.verified, false);
  assertEquals(result.error, "credential_not_found");
});

Deno.test("gate: zero credentials — standard session confirms, never a lockout", async () => {
  const gate = await requireFaceIdGate(stubApp([]), null, USER, null, ACTION, null);
  assertEquals(gate.ok, true);
  assertEquals(gate.reason, "faceid_not_enrolled");
});

Deno.test("gate: an active credential without an assertion blocks the sensitive action", async () => {
  const { coseB64, credentialIdB64 } = await makeCredential();
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const gate = await requireFaceIdGate(app, null, USER, RP, ACTION, null);
  assertEquals(gate.ok, false);
  assertEquals(gate.reason, "face_id_required");
});

Deno.test("gate: an active credential with a valid assertion passes", async () => {
  const { keyPair, coseB64, credentialIdB64 } = await makeCredential();
  const challenge = "a".repeat(64);
  const assertion = await buildAssertion({ challenge, action: ACTION, keyPair, credentialIdB64 });
  const app = stubApp([
    { id: "bc1", credential_id: credentialIdB64, public_key: coseB64, sign_count: 0, status: "Active" },
  ]);
  const db = await stubDb({ challenge, email: USER.email, userId: USER.id, action: ACTION });
  const gate = await requireFaceIdGate(app, db, USER, RP, ACTION, assertion);
  assertEquals(gate.ok, true);
  assertEquals(gate.reason, "face_id_verified");
});

Deno.test("BiometricCredential RLS: every operation is owner-scoped — user A can never see or verify against user B's credentials", () => {
  const schema = JSON.parse(Deno.readTextFileSync("base44/entities/BiometricCredential.jsonc"));
  for (const op of ["read", "create", "update", "delete"]) {
    assertEquals(schema.rls[op], { created_by_id: "{{user.id}}" });
  }
});

Deno.test("no client-side writes to BiometricCredential — all writes go through the backend functions", () => {
  const violations = [];
  const walk = (dir) => {
    for (const entry of Deno.readDirSync(dir)) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory) walk(path);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const src = Deno.readTextFileSync(path);
        if (/entities\.BiometricCredential\.(create|update|bulkCreate|bulkUpdate|updateMany|deleteMany|delete)\b/.test(src)) {
          violations.push(path);
        }
      }
    }
  };
  walk("src");
  assertEquals(violations, []);
});