// Pure, database-free helpers for the LBC AI data-integrity layer.
// Extracted from lbcAiDataIntegrity so they can be unit-tested without a
// live database. No founder PII beyond the fixed post-baseline drift target
// identifiers, which are part of the reviewed repair manifest.

// --- Baseline cohort --------------------------------------------------------
// The reviewed historical migration cohort (80 conversations / 954 messages /
// 48 shared). Records created at or after BASELINE_CUTOFF are post-baseline
// and reported as a separate delta — never weakening the baseline.
export const BASELINE_CUTOFF = "2026-08-02T02:24:38.973000";
export const BASELINE_TOTALS = { Conversation: 80, Message: 954, SharedConversation: 48 };

// --- Post-baseline drift repair (one-time, hash-bound) ----------------------
export const DRIFT_CONFIRM_PHRASE = "REPAIR_POST_BASELINE_DRIFT_LBC_AI";
export const DRIFT_OWNER_EMAIL = "mokhtartareksamara@gmail.com";

// Exactly the post-baseline records that slipped through before the server
// creation path was fixed. The conversation + shared carry null ownership;
// the two messages already carry the server-stamped owner_email (from
// chatWithLumina) and must NOT be re-written.
export const DRIFT_TARGETS = {
  conversation: {
    id: "6a6eaa66348c730a62cdde4a",
    expected_owner_email: null,
    expected_ownership_state: null,
    applied_owner_email: DRIFT_OWNER_EMAIL,
    applied_ownership_state: "human_verified",
  },
  messages: [
    { id: "6a6eaa675957b378a662c6d0", conversation_id: "6a6eaa66348c730a62cdde4a", expected_owner_email: DRIFT_OWNER_EMAIL },
    { id: "6a6eaa6cc83bdfb4394feb39", conversation_id: "6a6eaa66348c730a62cdde4a", expected_owner_email: DRIFT_OWNER_EMAIL },
  ],
  shared: {
    id: "6a6eaa6c484cab9b3b1f4ee1",
    conversation_id: "6a6eaa66348c730a62cdde4a",
    expected_owner_email: null,
    applied_owner_email: DRIFT_OWNER_EMAIL,
  },
};

// --- Identity classification (server-side only; never trusts browser) -------
export function isHumanEmail(v) {
  if (!v || typeof v !== "string") return false;
  const lower = v.toLowerCase().trim();
  if (!lower || lower === "anonymous") return false;
  if (lower.startsWith("service") || lower.includes("no-reply.base44.com")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);
}

// Classify a parent Conversation's ownership from explicit stamped fields only.
// Returns "human_verified" | "anonymous_legacy" | "owner_metadata_unavailable".
// A bare owner_email without the ownership_state stamp is NOT trusted.
export function classifyParent(parent) {
  if (!parent) return "owner_metadata_unavailable";
  const state = parent.ownership_state;
  const email = parent.owner_email;
  if (state === "human_verified") {
    return isHumanEmail(email) ? "human_verified" : "owner_metadata_unavailable";
  }
  if (state === "anonymous_legacy") {
    return (!email || String(email).trim() === "") ? "anonymous_legacy" : "owner_metadata_unavailable";
  }
  return "owner_metadata_unavailable";
}

// --- Cohort splitting --------------------------------------------------------
export function splitCohort(records, cutoff) {
  const baseline = [];
  const postBaseline = [];
  for (const r of records || []) {
    if (r && r.created_date && r.created_date < cutoff) baseline.push(r);
    else postBaseline.push(r);
  }
  return { baseline, postBaseline };
}

// --- Drift target verification ----------------------------------------------
// Verifies the post-baseline drift targets are in their expected pre-fix
// state before any ownership fields are applied.
// `actorOwnsConversation` is the server's evidence that the authenticated
// actor is the created_by of the drift conversation (a successful user-scoped
// read under RLS created_by == user.email).
export function verifyDriftTargets({ convo, messages, shared, actorOwnsConversation }) {
  const reasons = [];
  const t = DRIFT_TARGETS;
  if (!convo) {
    reasons.push("conversation_missing");
  } else {
    if (convo.id !== t.conversation.id) reasons.push("conversation_id_mismatch");
    if (convo.owner_email !== t.conversation.expected_owner_email) reasons.push("conversation_owner_email_not_null");
    if (convo.ownership_state !== t.conversation.expected_ownership_state) reasons.push("conversation_ownership_state_not_null");
    if (!actorOwnsConversation) reasons.push("created_by_not_actor");
  }
  const msgById = {};
  for (const m of messages || []) if (m) msgById[m.id] = m;
  for (const tm of t.messages) {
    const m = msgById[tm.id];
    if (!m) {
      reasons.push(`message_missing:${tm.id}`);
    } else {
      if (m.conversation_id !== tm.conversation_id) reasons.push(`message_parent_mismatch:${tm.id}`);
      if (m.owner_email !== tm.expected_owner_email) reasons.push(`message_owner_unexpected:${tm.id}`);
    }
  }
  if (!shared) {
    reasons.push("shared_missing");
  } else {
    if (shared.id !== t.shared.id) reasons.push("shared_id_mismatch");
    if (shared.conversation_id !== t.shared.conversation_id) reasons.push("shared_parent_mismatch");
    if (shared.owner_email !== t.shared.expected_owner_email) reasons.push("shared_owner_email_not_null");
  }
  return { ok: reasons.length === 0, reasons };
}

// Plan the apply: only missing ownership fields are returned. Messages are
// never re-written (they already carry the server-stamped owner_email).
export function planDriftApply({ convo, shared }) {
  const t = DRIFT_TARGETS;
  const plan = { conversation: null, shared: null, messages: [] };
  if (convo && (convo.owner_email === null || convo.owner_email === undefined)) {
    plan.conversation = {
      id: convo.id,
      owner_email: t.conversation.applied_owner_email,
      ownership_state: t.conversation.applied_ownership_state,
    };
  }
  if (shared && (shared.owner_email === null || shared.owner_email === undefined)) {
    plan.shared = { id: shared.id, owner_email: t.shared.applied_owner_email };
  }
  return plan;
}