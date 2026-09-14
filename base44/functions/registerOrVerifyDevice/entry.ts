import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  MIN_KEY_LENGTH,
  normalizeDeviceKey,
  hashDeviceKey,
  resolveVerification,
  buildEnrollmentRecord,
  confirmationCode,
} from '../../shared/deviceKeys.ts';

// Server-side device verification. The browser holds a random app-generated
// key in local storage; only its SHA-256 hash is ever stored, compared, or
// logged — never the raw key, never hardware identifiers.
//
// Security model:
//  - Every read and write runs through the user-scoped client, so RLS
//    enforces strict per-user isolation: user A can never see, verify
//    against, or revoke user B's devices.
//  - All DeviceKey writes happen here. The app's client code never writes
//    device records.
//  - A revoked key is never re-verified — the device must enroll as a new
//    one with a fresh key.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'verify';

    if (action === 'revoke') {
      const deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
      if (!deviceId) return Response.json({ error: 'Missing device_id' }, { status: 400 });
      // RLS-scoped read: a foreign device id simply returns nothing.
      let devices = [];
      try {
        devices = await base44.entities.DeviceKey.filter({ id: deviceId });
      } catch (_) {}
      if (!devices?.[0]) return Response.json({ error: 'Device Not Found.' }, { status: 404 });
      await base44.entities.DeviceKey.update(deviceId, { status: 'Revoked' });
      return Response.json({ ok: true });
    }

    if (action !== 'verify') {
      return Response.json({ error: 'Unknown Action' }, { status: 400 });
    }

    const deviceKey = normalizeDeviceKey(body.device_key);
    if (deviceKey.length < MIN_KEY_LENGTH) {
      return Response.json({ error: 'Invalid Device Key' }, { status: 400 });
    }

    // Hashed server-side — the raw key is never stored or compared.
    const keyHash = await hashDeviceKey(deviceKey);

    // RLS-scoped lookup: only this user's devices can ever match.
    let existing = [];
    try {
      existing = await base44.entities.DeviceKey.filter({ key_hash: keyHash });
    } catch (_) {}
    const match = existing?.[0];
    const outcome = resolveVerification(match ? { status: match.status } : null);

    if (outcome.verified) {
      await base44.entities.DeviceKey.update(match.id, { last_seen: today() });
      return Response.json({ verified: true, device_id: match.id, device_name: match.device_name });
    }
    if (outcome.revoked) {
      return Response.json({ verified: false, revoked: true });
    }

    // First enrollment — store only the hash, return the one-time code.
    const record = buildEnrollmentRecord(keyHash, today());
    const created = await base44.entities.DeviceKey.create(record);
    return Response.json({
      verified: false,
      enrolled: true,
      device_id: created.id,
      device_name: record.device_name,
      confirmation_code: confirmationCode(deviceKey),
    });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}