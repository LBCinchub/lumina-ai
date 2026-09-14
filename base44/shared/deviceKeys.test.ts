// Unit tests for the LBC AI device-verification invariants.
// Run: deno test --allow-env --allow-read base44/shared/deviceKeys.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.13";
import {
  normalizeDeviceKey,
  hashDeviceKey,
  deviceSuffixFromHash,
  confirmationCode,
  resolveVerification,
  buildEnrollmentRecord,
  containsRawKey,
} from "./deviceKeys.ts";

Deno.test("hashDeviceKey: SHA-256 hex, deterministic, per-key unique", async () => {
  const raw = "11111111-2222-3333-4444-555555555555";
  const hash = await hashDeviceKey(raw);
  assertEquals(/^[0-9a-f]{64}$/.test(hash), true);
  assertEquals(await hashDeviceKey(raw), hash);
  const other = await hashDeviceKey("99999999-8888-7777-6666-555555555555");
  assertEquals(other === hash, false);
});

Deno.test("hash-only storage: enrollment record contains no raw key or confirmation prefix", async () => {
  const raw = "abcdef01-2345-6789-abcd-ef0123456789";
  const hash = await hashDeviceKey(raw);
  const record = buildEnrollmentRecord(hash, "2026-09-14");
  assertEquals(containsRawKey(record, raw), false);
  assertEquals(record.key_hash, hash);
  assertEquals(record.status, "Active");
  assertEquals(record.first_seen, "2026-09-14");
  assertEquals(record.last_seen, "2026-09-14");
  // The detector actually catches leaks.
  assertEquals(containsRawKey({ sneaky: raw }, raw), true);
});

Deno.test("device names derive from the hash, never the raw key", async () => {
  const raw = "abcdef01-2345-6789-abcd-ef0123456789";
  const hash = await hashDeviceKey(raw);
  const record = buildEnrollmentRecord(hash, "2026-09-14");
  assertEquals(record.device_name, `Device ${deviceSuffixFromHash(hash)}`);
  assertEquals(record.device_name.includes(raw), false);
  assertEquals(record.device_name.includes(confirmationCode(raw)), false);
});

Deno.test("revoke blocks re-verification; a revoked device must re-enroll as new", () => {
  assertEquals(resolveVerification({ status: "Active" }), { verified: true, revoked: false, enrolled: false });
  assertEquals(resolveVerification({ status: "Revoked" }), { verified: false, revoked: true, enrolled: false });
  assertEquals(resolveVerification(null), { verified: false, revoked: false, enrolled: true });
});

Deno.test("re-enrollment after cleared browser data: a fresh key is a new device", async () => {
  const oldKey = "11111111-2222-3333-4444-555555555555";
  const newKey = "aaaabbbb-cccc-dddd-eeee-ffff00001111";
  const oldHash = await hashDeviceKey(oldKey);
  const newHash = await hashDeviceKey(newKey);
  assertEquals(oldHash === newHash, false);
  const oldRec = buildEnrollmentRecord(oldHash, "2026-09-14");
  const newRec = buildEnrollmentRecord(newHash, "2026-09-15");
  assertEquals(oldRec.device_name === newRec.device_name, false);
});

Deno.test("normalizeDeviceKey trims whitespace before hashing", async () => {
  const raw = "abcdef01-2345-6789-abcd-ef0123456789";
  assertEquals(normalizeDeviceKey(`  ${raw}  `), raw);
});

Deno.test("DeviceKey RLS: every operation is owner-scoped — user A can never see or verify against user B's devices", () => {
  const schema = JSON.parse(Deno.readTextFileSync("base44/entities/DeviceKey.jsonc"));
  for (const op of ["read", "create", "update", "delete"]) {
    assertEquals(schema.rls[op], { created_by_id: "{{user.id}}" });
  }
});

Deno.test("no client-side writes to DeviceKey — all writes go through registerOrVerifyDevice", () => {
  const violations = [];
  const walk = (dir) => {
    for (const entry of Deno.readDirSync(dir)) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory) walk(path);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const src = Deno.readTextFileSync(path);
        if (/entities\.DeviceKey\.(create|update|bulkCreate|bulkUpdate|updateMany|deleteMany|delete)\b/.test(src)) {
          violations.push(path);
        }
      }
    }
  };
  walk("src");
  assertEquals(violations, []);
});