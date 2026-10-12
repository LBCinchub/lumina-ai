// Central conversation/message eligibility for LBC AI Ultra. Every path that
// puts chat content into a model prompt (current thread, explicitly selected
// threads, automatic recall) uses these helpers. Identity comes ONLY from the
// authenticated server session `user`. Admin role and RLS-visible reads grant
// nothing here. All lookups fail closed (throw), never "allow on error".

export const MAX_SELECTED_THREADS = 5;
export const SELECTED_MESSAGES_PER_THREAD = 20;
const QUARANTINE_CHUNK = 100;
const QUARANTINE_PAGE = 500;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const norm = (e) => String(e || '').trim().toLowerCase();

export function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

// Bounded, sanitized, deduplicated id list (order preserved).
export function sanitizeIds(ids, max) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(isValidId))].slice(0, max);
}

// Parent: server-stamped human_verified and owned by THIS session.
// Unknown/anonymous legacy parents are always excluded.
export function isOwnedConversation(c, user) {
  if (!c || !user || !user.email || !user.id) return false;
  if (c.ownership_state !== 'human_verified') return false;
  if (norm(c.owner_email) !== norm(user.email)) return false;
  if (c.created_by_id && c.created_by_id !== user.id) return false;
  return true;
}

// Child: belongs to that parent AND stamped with this session's owner.
export function isOwnedMessage(m, convoId, user) {
  return !!m && !!user && m.conversation_id === convoId && norm(m.owner_email) === norm(user.email);
}

// Unresolved quarantine ids. Chunked so no lookup is silently truncated: a
// full page means the result may be incomplete, so it throws (fail closed).
export async function quarantineSet(db, entityType, ids) {
  const out = new Set();
  const list = [...new Set(ids)];
  for (let i = 0; i < list.length; i += QUARANTINE_CHUNK) {
    const chunk = list.slice(i, i + QUARANTINE_CHUNK);
    const rows = await db.entities.AiDataQuarantine.filter(
      { entity_type: entityType, record_id: { $in: chunk } }, '-created_date', QUARANTINE_PAGE);
    if (!Array.isArray(rows) || rows.length >= QUARANTINE_PAGE) throw new Error('quarantine lookup incomplete');
    for (const r of rows) if (r.resolved !== true) out.add(r.record_id);
  }
  return out;
}

// Current parent: explicit server predicate, independent of RLS/admin reads.
// Returns the conversation or null (caller answers a non-disclosing 404).
export async function authorizeConversation(db, user, conversationId) {
  if (!isValidId(conversationId)) return null;
  try {
    const rows = await db.entities.Conversation.filter({ id: conversationId }, null, 2);
    const c = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!c || c.id !== conversationId || !isOwnedConversation(c, user)) return null;
    const q = await quarantineSet(db, 'Conversation', [c.id]);
    return q.has(c.id) ? null : c;
  } catch (_) {
    return null;
  }
}

// Eligible children of an authorized parent: owner-stamped and not
// quarantined. `restricted` = rows existed but were excluded, so callers never
// mistake a filtered result for "no history". Throws on lookup failure.
export async function eligibleMessages(db, user, convoId, rows) {
  const owned = rows.filter(m => isOwnedMessage(m, convoId, user));
  const q = await quarantineSet(db, 'Message', owned.map(m => m.id));
  const messages = owned.filter(m => !q.has(m.id));
  return { messages, restricted: messages.length < rows.length };
}

// Explicitly selected prior threads: same parent+child rules as auto recall.
// Selection authorizes only these eligible ids, never anything else.
export async function authorizeSelectedThreads(db, user, ids, currentId) {
  const wanted = sanitizeIds(ids, MAX_SELECTED_THREADS).filter(id => id !== currentId);
  const requested = Array.isArray(ids) ? ids.length : 0;
  if (!wanted.length) return { status: requested ? 'restricted' : 'none', threads: [] };
  const parents = await db.entities.Conversation.filter({ id: { $in: wanted } }, null, wanted.length);
  const owned = (parents || []).filter(c => wanted.includes(c.id) && isOwnedConversation(c, user));
  const qp = await quarantineSet(db, 'Conversation', owned.map(c => c.id));
  const eligible = owned.filter(c => !qp.has(c.id));
  const threads = [];
  let restricted = eligible.length < wanted.length || wanted.length < requested;
  for (const c of eligible) {
    const rows = await db.entities.Message.filter({ conversation_id: c.id }, '-created_date', SELECTED_MESSAGES_PER_THREAD);
    const r = await eligibleMessages(db, user, c.id, rows || []);
    if (r.restricted) restricted = true;
    const msgs = [...r.messages].sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));
    if (msgs.length) threads.push({ convo: c, msgs });
  }
  return { status: restricted ? 'restricted' : 'ok', threads };
}