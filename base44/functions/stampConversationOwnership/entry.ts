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
// Accepts POST JSON: { action: "dry_run"|"apply",
//   records: [{ id, owner_email?, ownership_state }], confirmation_phrase?,
//   dry_run_id?, manifest_fingerprint? }
//
// HARD RULES:
//  - requireFounderOrAdmin server-side; every denied/failed/success attempt is
//    audited (AiActionAudit) and a SecurityEvent is written on auth denial.
//  - records must contain exactly 80 unique existing Conversation IDs.
//  - exactly 65 records must be ownership_state:"human_verified" with a
//    normalized non-service owner_email from the migration allowlist.
//  - exactly 15 records must be ownership_state:"anonymous_legacy" with no
//    owner_email.
//  - every ID must exist. Reject missing, duplicate, unknown owner, bad state,
//    human-without-email, anonymous-with-email, and any existing conflicting
//    stamp.
//  - dry_run makes zero writes and returns totals, conflicts, missing IDs,
//    normalized manifest fingerprint/hash, code_version, apply_blocked.
//  - apply requires the exact phrase STAMP_VERIFIED_LBC_AI_PARENTS, the exact
//    dry_run_id and manifest fingerprint from a fresh successful dry run,
//    unchanged current state, zero conflicts, and complete 80/65/15 totals.
//  - apply ONLY sets Conversation.owner_email and Conversation.ownership_state.
//    It never edits content, titles, summaries, messages, or timestamps
//    intentionally and never deletes.
//  - Audit/repair rows store counts + hash only; no message content or secrets.
//  - Idempotent rerun returns already_stamped counts; a conflicting rerun aborts.

const CODE_VERSION = "stamp_conversation_ownership_v1_20260802";
const CONFIRM_PHRASE = "STAMP_VERIFIED_LBC_AI_PARENTS";
const ACTION_TYPE = "stamp_conversation_ownership";

const EXPECTED = { records: 80, human_verified: 65, anonymous_legacy: 15 };

const HUMAN_OWNER_ALLOWLIST = new Set([
  "mokhtartareksamara@gmail.com",
  "hajwheels@gmail.com",
  "belalautoservices@gmail.com",
  "bouhaikalhajara@gmail.com",
]);

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

// Validate + normalize the submitted records into a clean manifest.
// Returns { manifest, manifestString, issues, counts, detail }.
function validateRecords(records) {
  const issues = [];
  if (!Array.isArray(records)) {
    return { manifest: null, manifestString: null, issues: ["records must be an array"], counts: null, detail: null };
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
    if (seen.has(r.id)) { dupIds.push(r.id); continue; }
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

  const manifestString = manifest
    .map(m => `${m.id}|${m.ownership_state}|${m.owner_email}`)
    .sort().join("\n");

  return {
    manifest: issues.length ? null : manifest,
    manifestString: issues.length ? null : manifestString,
    issues,
    counts: { records: records.length, human_verified: hv, anonymous_legacy: al },
    detail: { badState, humanNoEmail, anonWithEmail, badAllowlist, dupIds },
  };
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

    const v = validateRecords(body.records);
    if (v.issues.length || !v.manifest) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: action, status: "denied", resultSummary: `structural validation failed: ${v.issues.join("; ").slice(0, 300)}`, requestHash: null });
      return Response.json({
        error: "Record validation failed",
        code_version: CODE_VERSION,
        issues: v.issues,
        counts: v.counts,
        detail: v.detail,
      }, { status: 400 });
    }

    const manifest = v.manifest;
    const manifestFingerprint = await sha256Hex(v.manifestString);
    const manifestHash = manifestFingerprint.slice(0, 16);
    const ids = manifest.map(m => m.id);

    // Load existing conversations for these ids.
    let existing = [];
    try { existing = await db.entities.Conversation.filter({ id: { $in: ids } }); } catch (_) { existing = []; }
    const convoById = {};
    for (const c of existing) convoById[c.id] = c;
    const missingIds = ids.filter(id => !convoById[id]);

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
    const apply_blocked = missingIds.length > 0 || conflicts.length > 0;

    if (action === "dry_run") {
      const run = await db.entities.AiDataRepairRun.create({
        action: "stamp_dry_run", actor_email: user.email, status: "running",
        started_at: new Date().toISOString(),
      });
      const blob = {
        code_version: CODE_VERSION,
        totals: { records: manifest.length, human_verified: v.counts.human_verified, anonymous_legacy: v.counts.anonymous_legacy },
        missing_ids: missingIds,
        already_stamped: already.length,
        needs_stamp: needs.length,
        conflicts_count: conflicts.length,
        manifest_fingerprint: manifestFingerprint,
        state_fingerprint: stateFingerprint,
        apply_blocked,
      };
      await db.entities.AiDataRepairRun.update(run.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify(blob),
        summary: `stamp_dry_run v${CODE_VERSION}: records=${manifest.length} hv=${v.counts.human_verified} al=${v.counts.anonymous_legacy} already=${already.length} needs=${needs.length} conflicts=${conflicts.length} missing=${missingIds.length} apply_blocked=${apply_blocked} fp=${manifestHash}`,
      });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "dry_run", status: "success", resultSummary: `fp=${manifestHash} apply_blocked=${apply_blocked}`, requestHash: manifestHash });
      return Response.json({
        action: "dry_run",
        run_id: run.id,
        code_version: CODE_VERSION,
        totals: blob.totals,
        already_stamped: already.length,
        needs_stamp: needs.length,
        conflicts,
        missing_ids: missingIds,
        manifest_fingerprint: manifestFingerprint,
        manifest_hash: manifestHash,
        state_fingerprint: stateFingerprint,
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
      return Response.json({ error: "manifest_fingerprint does not match submitted records" }, { status: 409 });
    }

    // Load the bound dry-run.
    let runRows = [];
    try { runRows = await db.entities.AiDataRepairRun.filter({ id: body.dry_run_id }); } catch (_) {}
    const run = runRows && runRows[0];
    if (!run) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "dry_run not found", requestHash: manifestHash });
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

    // Unchanged current state: recompute state fingerprint from the apply-time
    // load and compare to the dry-run's stashed fingerprint.
    const freshStateFingerprint = await sha256Hex(currentStateString(convoById, manifest));
    if (freshStateFingerprint !== stashed.state_fingerprint) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: "current state changed since dry-run", requestHash: manifestHash });
      return Response.json({ error: "Current state changed since dry-run — rerun dry_run" }, { status: 409 });
    }

    // Zero conflicts / zero missing required for apply.
    if (missingIds.length > 0 || conflicts.length > 0) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: "apply", status: "denied", resultSummary: `blocked: missing=${missingIds.length} conflicts=${conflicts.length}`, requestHash: manifestHash });
      return Response.json({ error: "Apply blocked", missing_ids: missingIds, conflicts }, { status: 409 });
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