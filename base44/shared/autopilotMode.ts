// Persistent Mode preference: owner-scoped, server-confirmed, fail-loud.
// Uses only documented entity operations (filter / create / update by id).
// The SDK documents no unique constraint or compare-and-swap for this entity,
// so duplicates are DETECTED and refused (409) rather than guessed or deleted.

export const BACKGROUND_BLOCKER =
  'Background Ready: a secured 5-minute scheduler advances your runs while you are away (research, planning, drafting, analysis, and documents). Documents finished while you are away are saved to your library the next time you sign in. Gmail, deep research, image, and build steps use your own session, so they pause until you return.';

export class ModeError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

const readFail = () => new ModeError('storage_read_failed', 'Could Not Read Your Saved Preference. Nothing Was Changed.', 503);

async function readOwned(db: any, ownerId: string) {
  let res: any;
  try { res = await db.entities.AutopilotPreference.filter({ owner_user_id: ownerId }); } catch (_) { throw readFail(); }
  const rows = Array.isArray(res) ? res : res?.items;
  if (!Array.isArray(rows)) throw readFail();
  const own = rows.filter((r: any) => r && r.owner_user_id === ownerId);
  if (own.length > 1) {
    throw new ModeError('duplicate_preferences', 'More Than One Saved Preference Exists For Your Account. It Needs Manual Review Before It Can Change.', 409);
  }
  return own[0] || null;
}

const view = (r: any) => ({ enabled: r ? r.enabled === true : false, saved: !!r, changed_at: r?.changed_at || null });

export async function getMode(db: any, ownerId: string) {
  if (!ownerId) throw new ModeError('unauthorized', 'Unauthorized', 401);
  return view(await readOwned(db, ownerId));
}

export async function setMode(db: any, ownerId: string, enabled: unknown) {
  if (!ownerId) throw new ModeError('unauthorized', 'Unauthorized', 401);
  if (typeof enabled !== 'boolean') throw new ModeError('invalid_input', 'enabled Must Be true Or false.', 400);
  const existing = await readOwned(db, ownerId);
  const changed_at = new Date().toISOString();
  try {
    if (existing) await db.entities.AutopilotPreference.update(existing.id, { enabled, changed_at });
    else await db.entities.AutopilotPreference.create({ owner_user_id: ownerId, enabled, changed_at });
  } catch (_) {
    throw new ModeError('storage_write_failed', 'Your Change Was Not Saved. The Previous Setting Is Unchanged.', 503);
  }
  const after = await readOwned(db, ownerId);
  if (!after || after.enabled !== enabled) {
    throw new ModeError('not_persisted', 'Storage Did Not Confirm The Change. Please Retry.', 503);
  }
  return view(after);
}