import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  requireFounderOrAdmin, errorResponse, sha256Hex,
  writeAudit, writeSecurityEvent,
} from '../../shared/security.ts';

// Owner-only migration gate for LBC AI Conversation parent ownership stamps.
// Phase 1 of the data-integrity migration: stamps Conversation.owner_email +
// Conversation.ownership_state so the lbcAiDataIntegrity dry_run can resolve
// every parent and backfill child Messages / SharedConversations.
//
// Accepts TWO input shapes, both normalized to the same manifest:
//  (A) compact groups:
//        { action, groups: { mokhtar:[ids], haj:[ids], belal:[ids],
//          bouhaikal:[ids], anonymous:[ids] }, dry_run_id?,
//          manifest_fingerprint?, confirmation_phrase? }
//  (B) full records (kept for backward compatibility):
//        { action, records: [{ id, owner_email?, ownership_state }], ... }
//
// Owner emails are fixed SERVER-SIDE per group key (the browser cannot choose
// them): mokhtar->mokhtartareksamara@gmail.com, haj->hajwheels@gmail.com,
// belal->belalautoservices@gmail.com, bouhaikal->bouhaikalhajara@gmail.com.
// anonymous -> ownership_state "anonymous_legacy" with no owner_email.
//
// Exact group counts 48/1/9/7/15 (80 unique ids) are required for every
// accepted manifest, regardless of input shape.
//
// Existence is verified via Conversation.list('-created_date', 5000, 0)
// pagination (NOT Conversation.filter({id:{$in}}), which is unsupported), then
// submitted ids are selected in memory. Reject when the scan is capped, total
// Conversations != 80, any submitted id is missing, any current Conversation
// is not represented by the manifest, or any existing conflicting stamp.
//
// HARD RULES:
//  - requireFounderOrAdmin server-side; every denied/failed/success attempt
//    is audited (AiActionAudit) and a SecurityEvent is written on auth denial.
//  - dry_run makes ZERO writes and returns run_id, manifest_fingerprint,
//    current_state_fingerprint, counts, fixture booleans, and apply_blocked.
//  - apply requires the exact phrase STAMP_VERIFIED_LBC_AI_PARENTS, the exact
//    dry_run_id and manifest_fingerprint from a fresh successful dry run,
//    unchanged current state (drift revalidation), zero conflicts/missing/
//    extras, total Conversations == 80, and not capped.
//  - apply ONLY sets Conversation.owner_email and Conversation.ownership_state
//    via bulkUpdate. It never edits content, titles, summaries, messages, or
//    timestamps and never deletes.
//  - Audit/repair rows store counts + hash only; no message content or secrets.
//  - Idempotent rerun returns already_stamped counts; a conflicting rerun
//    aborts without writes.

const CODE_VERSION = "stamp_conversation_ownership_v2_20260802";
const CONFIRM_PHRASE = "STAMP_VERIFIED_LBC_AI_PARENTS";
const ACTION_TYPE = "stamp_conversation_ownership";

const EXPECTED = { records: 80, human_verified: 65, anonymous_legacy: 15 };

// Fixed migration distribution. mokhtar+haj+belal+bouhaikal = 65 human_verified,
// anonymous = 15 anonymous_legacy, total = 80 parents.
const GROUP_FIXTURE = { mokhtar: 48, haj: 1, belal: 9, bouhaikal: 7, anonymous: 15 };

const GROUP_TO_EMAIL = {
  mokhtar: "mokhtartareksamara@gmail.com",
  haj: "hajwheels@gmail.com",
  belal: "belalautoservices@gmail.com",
  bouhaikal: "bouhaikalhajara@gmail.com",
};

const HUMAN_OWNER_ALLOWLIST = new Set(Object.values(GROUP_TO_EMAIL));
const SCAN_LIMIT = 5000;

function isHumanEmail(v) {
  if (!v || typeof v !== "string") return false;
  const lower = v.toLowerCase().trim();
  if (!lower || lower === "anonymous") return false;
  if (lower.startsWith("service") || lower.includes("no-reply.base44.com")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);
}

function normalizeEmail(v) {
  if (!v || typeof v !== "string") return "";
  return v.toLowerCase().trim();
}

function normState(v) {
  return (v === "human_verified" || v === "anonymous_legacy") ? v : null;
}

// Safely resolve the actual Base44 SDK record identity from any supported
// runtime shape. The SDK normally exposes `id` as a top-level field, but some
// nested/legacy shapes carry it as `_id` or under a `data` envelope. Only the
// identity string is read — never record content, emails, titles, or messages.
function recordId(record) {
  if (!record || typeof record !== "object") return null;
  if (typeof record.id === "string" && record.id) return record.id;
  if (typeof record._id === "string" && record._id) return record._id;
  const data = record.data;
  if (data && typeof data === "object") {
    if (typeof data.id === "string" && data.id) return data.id;
    if (typeof data._id === "string" && data._id) return data._id;
  }
  return null;
}

// (A) Expand compact groups into a normalized manifest. Owner emails are
// assigned server-side from GROUP_TO_EMAIL; anonymous -> anonymous_legacy.
// Returns { manifest, issues, counts, source }.
function expandGroups(groups) {
  const issues = [];
  const source = "groups";
  if (!groups || typeof groups !== "object" || Array.isArray(groups)) {
    return { manifest: null, issues: ["groups must be an object"], counts: null, source };
  }
  const groupKeys = ["mokhtar", "haj", "belal", "bouhaikal", "anonymous"];
  const manifest = [];
  const seen = new Set();
  const dupIds = [];
  const counts = { mokhtar: 0, haj: 0, belal: 0, bouhaikal: 0, anonymous: 0 };

  for (const key of groupKeys) {
    const arr = groups[key];
    if (!Array.isArray(arr)) {
      issues.push(`group '${key}' must be an array`);
      continue;
    }
    counts[key] = arr.length;
    if (arr.length !== GROUP_FIXTURE[key]) {
      issues.push(`group '${key}' must have ${GROUP_FIXTURE[key]} ids, got ${arr.length}`);
    }
    const isAnon = key === "anonymous";
    const owner_email = isAnon ? "" : GROUP_TO_EMAIL[key];
    const ownership_state = isAnon ? "anonymous_legacy" : "human_verified";
    for (const id of arr) {
      if (!id || typeof id !== "string") { issues.push(`group '${key}' has a non-string id`); continue; }
      if (seen.has(id)) { if (!dupIds.includes(id)) dupIds.push(id); continue; }
      seen.add(id);
      manifest.push({ id, ownership_state, owner_email });
    }
  }

  if (dupIds.length) issues.push(`duplicate ids across groups: ${dupIds.length}`);

  return {
    manifest: issues.length ? null : manifest,
    issues,
    counts: { ...counts, records: manifest.length },
    source,
  };
}

// (B) Validate full-record input into a normalized manifest (existing format).
// Returns { manifest, manifestString, issues, counts, detail, source }.
function validateRecords(records) {
  const issues = [];
  const source = "records";
  if (!Array.isArray(records)) {
    return { manifest: null, manifestString: null, issues: ["records must be an array"], counts: null, detail: null, source };
  }
  if (records.length !== EXPECTED.records) {
    issues.push(`records length must be ${EXPECTED.records}, got ${records.length}`);
  }

  const seen = new Set();
  const dupIds = [];
  let hv = 0, al = 0;
  const badState = [], humanNoEmail = [], anonWithEmail = [], badAllowlist = [];
  const manifest = [];

  for (const r of records) {
    if (!r || !r.id || typeof r.id !== "string") { issues.push("each record needs a string id"); continue; }
    if (seen.has(r.id)) { if (!dupIds.includes(r.id)) dupIds.push(r.id); continue; }
    seen.add(r.id);
    const st = normState(r.ownership_state);
    if (!st) { badState.push(r.id); continue; }
    if (st === "human_verified") {
      hv++;
      const em = normalizeEmail(r.owner_email);
      if (!em || !isHumanEmail(em)) { humanNoEmail.push(r.id); continue; }
      if (!HUMAN_OWNER_ALLOWLIST.has(em)) { badAllowlist.push(r.id); continue; }
      manifest.push({ id: r.id, ownership_state: "human_verified", owner_email: em });
    } else {
      al++;
      const em = normalizeEmail(r.owner_email);
      if (em) { anonWithEmail.push(r.id); continue; }
      manifest.push({ id: r.id, ownership_state: "anonymous_legacy", owner_email: "" });
    }
  }

  if (dupIds.length) issues.push(`duplicate ids: ${dupIds.length}`);
  if (hv !== EXPECTED.human_verified) issues.push(`human_verified must be ${EXPECTED.human_verified}, got ${hv}`);
  if (al !== EXPECTED.anonymous_legacy) issues.push(`anonymous_legacy must be ${EXPECTED.anonymous_legacy}, got ${al}`);
  if (badState.length) issues.push(`bad ownership_state on ${badState.length} record(s)`);
  if (humanNoEmail.length) issues.push(`human_verified without valid email on ${humanNoEmail.length} record(s)`);
  if (anonWithEmail.length) issues.push(`anonymous_legacy carrying an email on ${anonWithEmail.length} record(s)`);
  if (badAllowlist.length) issues.push(`owner not in migration allowlist on ${badAllowlist.length} record(s)`);

  return {
    manifest: issues.length ? null : manifest,
    issues,
    counts: { records: records.length, human_verified: hv, anonymous_legacy: al },
    detail: { badState, humanNoEmail, anonWithEmail, badAllowlist, dupIds },
    source,
  };
}

// Derive per-group counts from any normalized manifest (by owner_email /
// ownership_state). Used for the unified fixture check on both input paths.
function deriveGroupCounts(manifest) {
  const g = { mokhtar: 0, haj: 0, belal: 0, bouhaikal: 0, anonymous: 0 };
  for (const m of manifest) {
    if (m.ownership_state === "anonymous_legacy") { g.anonymous++; continue; }
    if (m.owner_email === GROUP_TO_EMAIL.mokhtar) g.mokhtar++;
    else if (m.owner_email === GROUP_TO_EMAIL.haj) g.haj++;
    else if (m.owner_email === GROUP_TO_EMAIL.belal) g.belal++;
    else if (m.owner_email === GROUP_TO_EMAIL.bouhaikal) g.bouhaikal++;
  }
  return g;
}

// Authoritative fixture check: the normalized manifest must match the fixed
// 48/1/9/7/15 distribution exactly. Returns { groupCounts, match, issues }.
function checkFixture(manifest) {
  const g = deriveGroupCounts(manifest);
  const issues = [];
  for (const key of Object.keys(GROUP_FIXTURE)) {
    if (g[key] !== GROUP_FIXTURE[key]) {
      issues.push(`group '${key}' must be ${GROUP_FIXTURE[key]}, got ${g[key]}`);
    }
  }
  return { groupCounts: g, match: issues.length === 0, issues };
}

// Build the manifest fingerprint from a normalized manifest (stable, sorted).
function manifestStringFor(manifest) {
  return manifest
    .map(m => `${m.id}|${m.ownership_state}|${m.owner_email}`)
    .sort().join("\n");
}

// Compare a current Conversation state to a manifest target.
function stampStatus(current, target) {
  const curState = (current && current.ownership_state) || "";
  const curEmail = normalizeEmail(current && current.owner_email);
  if (curState === target.ownership_state && curEmail === target.owner_email) return "already_stamped";
  if (curState === "" && curEmail === "") return "needs_stamp";
  return "conflict";
}

// Current-state fingerprint over the manifest ids (marks missing ids).
function currentStateString(convoById, manifest) {
  const items = manifest.map(m => {
    const c = convoById[m.id];
    if (!c) return `${m.id}|missing`;
    return `${m.id}|${c.ownership_state || ""}|${normalizeEmail(c.owner_email)}`;
  });
  return items.sort().join("\n");
}

export default async function(req) {
  let base44;
  try { base44 = createClientFromRequest(req); } catch (_) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth = await requireFounderOrAdmin(base44);
  if (auth.error) {
    try {
      await writeSecurityEvent(base44.asServiceRole, {
        eventType: "auth_denied", actorEmail: auth.user?.email || null,
        resourceType: "Conversation", outcome: "blocked",
        metadata: "stampConversationOwnership: founder/admin required",
      });
    } catch (_) {}
    return errorResponse(auth.error);
  }
  const user = auth.user;
  const db = base44.asServiceRole;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action !== "dry_run" && action !== "apply") {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: String(action || "unknown"), status: "denied", resultSummary: "unknown action", requestHash: null });
      return Response.json({ error: "action must be dry_run or apply" }, { status: 400 });
    }

    // Build the normalized manifest from whichever input shape was provided.
    let built;
    if (body.groups) {
      built = expandGroups(body.groups);
    } else if (body.records) {
      built = validateRecords(body.records);
    } else {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: action, status: "denied", resultSummary: "missing groups/records", requestHash: null });
      return Response.json({ error: "Provide 'groups' or 'records'" }, { status: 400 });
    }

    let issues = [...built.issues];
    let manifest = built.manifest;

    // Unified fixture check on the normalized manifest (both paths).
    let groupCounts = null;
    if (manifest) {
      const fg = checkFixture(manifest);
      groupCounts = fg.groupCounts;
      if (!fg.match) {
        issues.push(...fg.issues);
        manifest = null;
      }
    }

    if (issues.length || !manifest) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: action, status: "denied", resultSummary: `structural validation failed: ${issues.join("; ").slice(0, 300)}`, requestHash: null });
      return Response.json({
        error: "Manifest validation failed",
        code_version: CODE_VERSION,
        source: built.source,
        issues,
        counts: built.counts,
        group_counts: groupCounts,
        detail: built.detail || null,
      }, { status: 400 });
    }

    const manifestString = manifestStringFor(manifest);
    const manifestFingerprint = await sha256Hex(manifestString);
    const manifestHash = manifestFingerprint.slice(0, 16);
    const ids = manifest.map(m => m.id);
    const submittedIdSet = new Set(ids);

    // Load ALL current Conversations via supported list pagination (NOT
    // Conversation.filter $in). Select submitted ids in memory.
    let page = [];
    try { page = await db.entities.Conversation.list('-created_date', SCAN_LIMIT, 0); } catch (_) { page = []; }
    const capped = Array.isArray(page) && page.length >= SCAN_LIMIT;
    const convoById = {};
    let unkeyedRecords = 0;
    for (const c of page) {
      const rid = recordId(c);
      if (rid) convoById[rid] = c;
      else unkeyedRecords++;
    }
    const totalConversations = page.length;

    const missingIds = ids.filter(id => !convoById[id]);
    const extraIds = Object.keys(convoById).filter(id => !submittedIdSet.has(id));

    // Classify each manifest entry against current state.
    const already = [], needs = [], conflicts = [];
    for (const m of manifest) {
      const s = stampStatus(convoById[m.id], m);
      if (s === "already_stamped") already.push(m.id);
      else if (s === "needs_stamp") needs.push(m.id);
      else conflicts.push({
        id: m.id,
        current: { ownership_state: convoById[m.id]?.ownership_state || "", owner_email: normalizeEmail(convoById[m.id]?.owner_email) },
        target: { ownership_state: m.ownership_state, owner_email: m.owner_email },
      });
    }

    const stateFingerprint = await sha256Hex(currentStateString(convoById, manifest));

    const fixtures = {
      group_counts_match: groupCounts != null && Object.keys(GROUP_FIXTURE).every(k => groupCounts[k] === GROUP_FIXTURE[k]),
      total_unique_ids: ids.length === EXPECTED.records,
      human_verified: (groupCounts ? groupCounts.mokhtar + groupCounts.haj + groupCounts.belal + groupCounts.bouhaikal : 0) === EXPECTED.human_verified,
      anonymous_legacy: (groupCounts ? groupCounts.anonymous : 0) === EXPECTED.anonymous_legacy,
      total_conversations_match: totalConversations === EXPECTED.records,
      no_missing: missingIds.length === 0,
      no_extras: extraIds.length === 0,
      no_conflicts: conflicts.length === 0,
      not_capped: !capped,
      no_unkeyed: unkeyedRecords === 0,
    };

    const apply_blocked = capped || unkeyedRecords > 0 || totalConversations !== EXPECTED.records
      || missingIds.length > 0 || extraIds.length > 0 || conflicts.length > 0;

    if (action === "dry_run") {
      const run = await db.entities.AiDataRepairRun.create({
        action: "stamp_dry_run", actor_email: user.email, status: "running",
        started_at: new Date().toISOString(),
      });
      const blob = {
        code_version: CODE_VERSION,
        source: built.source,
        totals: { records: manifest.length, human_verified: fixtures.human_verified ? EXPECTED.human_verified : (groupCounts ? groupCounts.mokhtar + groupCounts.haj + groupCounts.belal + groupCounts.bouhaikal : 0), anonymous_legacy: groupCounts ? groupCounts.anonymous : 0 },
        group_counts: groupCounts,
        total_conversations: totalConversations,
        unkeyed_records: unkeyedRecords,
        missing_ids: missingIds,
        extra_ids: extraIds,
        already_stamped: already.length,
        needs_stamp: needs.length,
        conflicts_count: conflicts.length,
        manifest_fingerprint: manifestFingerprint,
        state_fingerprint: stateFingerprint,
        fixtures,
        apply_blocked,
      };
      await db.entities.AiDataRepairRun.update(run.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify(blob),
        summary: `stamp_dry_run v${CODE_VERSION}: src=${built.source} total=${totalConversations} hv=${blob.totals.human_verified} al=${blob.totals.anonymous_legacy} already=${already.length} needs=${needs.length} conflicts=${conflicts.length} missing=${missingIds.length} extra=${extraIds.length} unkeyed=${unkeyedRecords} capped=${capped} apply_blocked=${apply_blocked} fp=${manifestHash}`,
      });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "dry_run", status: "success", resultSummary: `src=${built.source} fp=${manifestHash} apply_blocked=${apply_blocked}`, requestHash: manifestHash });
      return Response.json({
        action: "dry_run",
        run_id: run.id,
        code_version: CODE_VERSION,
        source: built.source,
        totals: blob.totals,
        group_counts: groupCounts,
        total_conversations: totalConversations,
        unkeyed_records: unkeyedRecords,
        already_stamped: already.length,
        needs_stamp: needs.length,
        conflicts,
        missing_ids: missingIds,
        extra_ids: extraIds,
        capped,
        manifest_fingerprint: manifestFingerprint,
        manifest_hash: manifestHash,
        state_fingerprint: stateFingerprint,
        fixtures,
        apply_blocked,
      });
    }

    // action === "apply"
    if (body.confirmation_phrase !== CONFIRM_PHRASE) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "confirmation phrase missing/incorrect", requestHash: manifestHash });
      return Response.json({ error: "Confirmation phrase required" }, { status: 400 });
    }
    if (!body.dry_run_id || !body.manifest_fingerprint) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "missing dry_run_id or manifest_fingerprint", requestHash: manifestHash });
      return Response.json({ error: "dry_run_id and manifest_fingerprint required" }, { status: 400 });
    }
    if (body.manifest_fingerprint !== manifestFingerprint) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "manifest_fingerprint mismatch vs records", requestHash: manifestHash });
      return Response.json({ error: "manifest_fingerprint does not match submitted manifest" }, { status: 409 });
    }

    // Load the bound dry-run.
    let runRows = [];
    try { runRows = await db.entities.AiDataRepairRun.filter({ id: body.dry_run_id }); } catch (_) {}
    const run = runRows && runRows[0];
    if (!run) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "dry-run not found", requestHash: manifestHash });
      return Response.json({ error: "dry-run not found" }, { status: 404 });
    }
    if (run.action !== "stamp_dry_run") {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "not a stamp dry-run", requestHash: manifestHash });
      return Response.json({ error: "Not a stamp dry-run record" }, { status: 400 });
    }
    if (run.status !== "completed") {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "dry-run not completed", requestHash: manifestHash });
      return Response.json({ error: "dry-run not completed" }, { status: 409 });
    }
    if ((run.summary || "").includes("| APPLIED")) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "dry-run already applied", requestHash: manifestHash });
      return Response.json({ error: "dry-run already applied" }, { status: 409 });
    }
    let stashed = null;
    try { stashed = JSON.parse(run.totals); } catch (_) {}
    if (!stashed || stashed.code_version !== CODE_VERSION) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "stale dry-run", requestHash: manifestHash });
      return Response.json({ error: "Stale dry-run — rerun dry_run" }, { status: 409 });
    }
    if (stashed.manifest_fingerprint !== manifestFingerprint) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "manifest fingerprint mismatch vs dry-run", requestHash: manifestHash });
      return Response.json({ error: "manifest_fingerprint does not match dry-run" }, { status: 409 });
    }

    // Drift revalidation: recompute the current-state fingerprint from the
    // apply-time load and compare to the dry-run's stashed fingerprint.
    const freshStateFingerprint = await sha256Hex(currentStateString(convoById, manifest));
    if (freshStateFingerprint !== stashed.state_fingerprint) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "current state changed since dry-run", requestHash: manifestHash });
      return Response.json({ error: "Current state changed since dry-run — rerun dry_run" }, { status: 409 });
    }

    // Apply gates: not capped, total == 80, no missing, no extras, no conflicts.
    if (capped) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "scan capped", requestHash: manifestHash });
      return Response.json({ error: "Scan capped — cannot confirm complete coverage" }, { status: 409 });
    }
    if (unkeyedRecords > 0) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: `unkeyable records: ${unkeyedRecords}`, requestHash: manifestHash });
      return Response.json({ error: "Scan produced unkeyable records — cannot confirm complete coverage", unkeyed_records: unkeyedRecords }, { status: 409 });
    }
    if (totalConversations !== EXPECTED.records) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: `total conversations ${totalConversations} != ${EXPECTED.records}`, requestHash: manifestHash });
      return Response.json({ error: "Total Conversations must be 80", total_conversations: totalConversations }, { status: 409 });
    }
    if (missingIds.length > 0 || extraIds.length > 0 || conflicts.length > 0) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: `blocked: missing=${missingIds.length} extra=${extraIds.length} conflicts=${conflicts.length}`, requestHash: manifestHash });
      return Response.json({ error: "Apply blocked", missing_ids: missingIds, extra_ids: extraIds, conflicts }, { status: 409 });
    }

    const applyRun = await db.entities.AiDataRepairRun.create({
      action: "stamp_apply", actor_email: user.email, status: "running",
      started_at: new Date().toISOString(),
    });

    const updates = [];
    let alreadyCount = 0;
    for (const m of manifest) {
      const s = stampStatus(convoById[m.id], m);
      if (s === "already_stamped") { alreadyCount++; continue; }
      if (s === "needs_stamp") {
        if (m.ownership_state === "human_verified") {
          updates.push({ id: m.id, owner_email: m.owner_email, ownership_state: "human_verified" });
        } else {
          updates.push({ id: m.id, ownership_state: "anonymous_legacy" });
        }
      } else {
        // Fresh conflict — abort without writes.
        await db.entities.AiDataRepairRun.update(applyRun.id, {
          status: "failed", finished_at: new Date().toISOString(),
          totals: JSON.stringify({ conflict_id: m.id }),
          summary: `stamp_apply v${CODE_VERSION}: ABORTED conflict on ${m.id}`,
        });
        await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "failed", resultSummary: `fresh conflict on ${m.id}`, requestHash: manifestHash });
        return Response.json({ error: "Conflict detected at apply time", conflict_id: m.id }, { status: 409 });
      }
    }

    if (updates.length > 0) {
      await db.entities.Conversation.bulkUpdate(updates);
    }
    const stampedCount = updates.length;

    await db.entities.AiDataRepairRun.update(applyRun.id, {
      status: "completed",
      finished_at: new Date().toISOString(),
      totals: JSON.stringify({ stamped: stampedCount, already_stamped: alreadyCount, total: manifest.length, manifest_fingerprint: manifestFingerprint }),
      summary: `stamp_apply v${CODE_VERSION}: stamped=${stampedCount} already=${alreadyCount} total=${manifest.length} fp=${manifestHash}`,
    });

    // Mark the bound dry-run consumed so it cannot authorize a second apply.
    try {
      await db.entities.AiDataRepairRun.update(run.id, { summary: `${run.summary || ""} | APPLIED ${new Date().toISOString()}` });
    } catch (_) {}

    await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "success", resultSummary: `stamped=${stampedCount} already=${alreadyCount} fp=${manifestHash}`, requestHash: manifestHash });

    return Response.json({
      action: "apply",
      run_id: applyRun.id,
      applied_to_dry_run: run.id,
      stamped: stampedCount,
      already_stamped: alreadyCount,
      total: manifest.length,
      manifest_fingerprint: manifestFingerprint,
    });
  } catch (error) {
    try {
      await writeAudit(db, { actorEmail: user?.email || null, actionType: ACTION_TYPE, target: "error", status: "error", resultSummary: "exception", requestHash: null });
    } catch (_) {}
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}