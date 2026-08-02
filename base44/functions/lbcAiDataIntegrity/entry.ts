import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireFounderOrAdmin, errorResponse, sha256Hex } from '../../shared/security.ts';

// Owner/admin-only data-integrity tool for LBC AI.
// Actions: dry_run (read-only), apply_verified (backfill owner_email + quarantine),
// status (latest runs).
//
// HARD RULES:
//  - Never deletes records.
//  - Parent ownership is classified ONLY from explicit Conversation fields:
//    `owner_email` + `ownership_state` (externally stamped by owner tools).
//    The system `created_by` is NOT used (service-role SDK omits it and it is
//    unreliable for legacy rows).
//  - human_verified  => ownership_state==="human_verified" AND a normalized
//    non-service owner_email.  Owner = parent.owner_email (backfill/already_ok/conflict).
//  - anonymous_legacy => ownership_state==="anonymous_legacy" AND no owner_email.
//    Quarantinable as legacy anonymous.
//  - Any other combination (missing state, human_verified without email,
//    anonymous_legacy carrying an email, unknown state value) =>
//    owner_metadata_unavailable, which BLOCKS apply. It is never quarantined.
//  - This function NEVER stamps or guesses parent ownership. Parent stamping is
//    external/deterministic, performed by owner tools.
//  - apply_verified is bound to a fresh completed dry_run from THIS code version,
//    with pagination complete, fixture checks passing, baselines intact, no
//    metadata-unavailable, and the exact confirmation phrase. It reclassifies
//    before writes and aborts on any drift in totals or owner mapping.
//  - No message content is stored in audit rows; fixture checks are booleans only.

const CODE_VERSION = "lbc_ai_integrity_v3_20260802";
const CONFIRM_PHRASE = "REPAIR_VERIFIED_LBC_AI_DATA";
const BATCH = 5000; // platform max per request

// Verified baseline totals (no deletes / no drift). Apply is blocked if these drift.
const EXPECTED_TOTALS = { Message: 954, SharedConversation: 48, Conversation: 80 };

// Fixture conversations used to validate owner resolution (booleans only, no PII).
const FIXTURES = [
  { id: "6a400735ed9c0b8c2b42ebd4", key: "fixture_6a400735_human" },
  { id: "6a13be31ab1dfe8d5ca391f4", key: "fixture_6a13be31_human" },
];

// A normalized human email: non-empty, well-formed, not a service/system marker,
// not the literal "anonymous" legacy marker.
function isHumanEmail(v) {
  if (!v || typeof v !== "string") return false;
  const lower = v.toLowerCase().trim();
  if (!lower || lower === "anonymous") return false;
  if (lower.startsWith("service") || lower.includes("no-reply.base44.com")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower);
}

// Classify a parent Conversation's ownership from explicit fields only.
// Returns: "human_verified" | "anonymous_legacy" | "owner_metadata_unavailable".
function classifyParent(parent) {
  if (!parent) return "owner_metadata_unavailable";
  const state = parent.ownership_state;
  const email = parent.owner_email;
  if (state === "human_verified") {
    return isHumanEmail(email) ? "human_verified" : "owner_metadata_unavailable";
  }
  if (state === "anonymous_legacy") {
    return (!email || String(email).trim() === "") ? "anonymous_legacy" : "owner_metadata_unavailable";
  }
  // No ownership_state (or unknown value): parent was never stamped by owner tools.
  // We do NOT trust a bare owner_email without the stamp.
  return "owner_metadata_unavailable";
}

// Complete pagination via supported list(sort, limit, skip). De-dupes IDs and
// reports pages scanned + whether the safety cap was reached.
async function listAll(db, entityName) {
  const all = [];
  const seen = new Set();
  let skip = 0;
  let pages = 0;
  let capped = false;
  while (pages < 100) {
    pages++;
    let batch;
    try {
      batch = await db.entities[entityName].list("-created_date", BATCH, skip);
    } catch (_) {
      break;
    }
    if (!batch || batch.length === 0) break;
    for (const b of batch) {
      if (b && b.id && !seen.has(b.id)) { seen.add(b.id); all.push(b); }
    }
    skip += batch.length;
    if (batch.length < BATCH) break;
  }
  if (pages >= 100) capped = true;
  return { records: all, pages_scanned: pages, capped };
}

function classify(records, convoById) {
  const r = {
    backfillable: [], already_ok: [], orphan: [],
    anonymous_legacy: [], owner_metadata_unavailable: [], conflict: [],
    total: records.length,
  };
  for (const m of records) {
    const parent = convoById[m.conversation_id];
    if (!parent) { r.orphan.push(m.id); continue; }
    const pc = classifyParent(parent);
    if (pc === "owner_metadata_unavailable") { r.owner_metadata_unavailable.push(m.id); continue; }
    if (pc === "anonymous_legacy") { r.anonymous_legacy.push(m.id); continue; }
    // human_verified
    const owner = parent.owner_email;
    if (m.owner_email && m.owner_email === owner) { r.already_ok.push(m.id); continue; }
    if (m.owner_email && m.owner_email !== owner) { r.conflict.push(m.id); continue; }
    r.backfillable.push({ id: m.id, owner_email: owner });
  }
  return r;
}

function classifyShared(records, convoById) {
  const r = {
    backfillable: [], already_ok: [], orphan: [],
    anonymous_legacy: [], owner_metadata_unavailable: [], conflict: [],
    title_copy: [], total: records.length,
  };
  for (const s of records) {
    const parent = convoById[s.conversation_id];
    if (!parent) { r.orphan.push(s.id); continue; }
    const pc = classifyParent(parent);
    if (pc === "owner_metadata_unavailable") { r.owner_metadata_unavailable.push(s.id); continue; }
    if (pc === "anonymous_legacy") { r.anonymous_legacy.push(s.id); continue; }
    // human_verified
    const owner = parent.owner_email;
    if (s.owner_email && s.owner_email === owner) { r.already_ok.push(s.id); }
    else if (s.owner_email && s.owner_email !== owner) { r.conflict.push(s.id); }
    else { r.backfillable.push({ id: s.id, owner_email: owner }); }
    if ((!s.title || s.title === "Synced conversation") && parent.title) {
      r.title_copy.push({ id: s.id, title: parent.title });
    }
  }
  return r;
}

async function backfillFingerprint(items) {
  const sorted = [...items].map(b => `${b.id}|${b.owner_email}`).sort().join("\n");
  return await sha256Hex(sorted);
}

async function fixtureChecks(db) {
  const out = {};
  for (const f of FIXTURES) {
    let rec = null;
    try {
      const res = await db.entities.Conversation.filter({ id: f.id });
      rec = res && res[0];
    } catch (_) { rec = null; }
    out[f.key] = !!(rec && classifyParent(rec) === "human_verified");
  }
  return out;
}

function countsOf(c) {
  return {
    total: c.total,
    backfillable: c.backfillable.length,
    already_ok: c.already_ok.length,
    orphan: c.orphan.length,
    anonymous_legacy: c.anonymous_legacy.length,
    owner_metadata_unavailable: c.owner_metadata_unavailable.length,
    conflict: c.conflict.length,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);
    const db = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const action = body.action || "status";

    if (action === "status") {
      let runs = [];
      try { runs = await db.entities.AiDataRepairRun.list("-created_date", 5); } catch (_) {}
      let openQuarantine = 0;
      try { openQuarantine = (await db.entities.AiDataQuarantine.filter({ resolved: false })).length; } catch (_) {}
      return Response.json({
        code_version: CODE_VERSION,
        latest_runs: runs.map(r => ({
          id: r.id, action: r.action, status: r.status,
          started_at: r.started_at, finished_at: r.finished_at, summary: r.summary,
        })),
        open_quarantine: openQuarantine,
      });
    }

    if (action === "dry_run") {
      const run = await db.entities.AiDataRepairRun.create({
        action: "dry_run", actor_email: user.email, status: "running",
        started_at: new Date().toISOString(),
      });

      const convos = await listAll(db, "Conversation");
      const convoById = {};
      for (const c of convos.records) convoById[c.id] = c;

      const messages = await listAll(db, "Message");
      const shared = await listAll(db, "SharedConversation");
      const mClass = classify(messages.records, convoById);
      const sClass = classifyShared(shared.records, convoById);

      const fixtures = await fixtureChecks(db);
      const hasMetadataUnavailable =
        mClass.owner_metadata_unavailable.length > 0 || sClass.owner_metadata_unavailable.length > 0;

      const fingerprint = await backfillFingerprint([
        ...mClass.backfillable,
        ...sClass.backfillable,
      ]);

      const totals = {
        Message: messages.records.length,
        SharedConversation: shared.records.length,
        Conversation: convos.records.length,
      };
      const baseline_match =
        totals.Message === EXPECTED_TOTALS.Message &&
        totals.SharedConversation === EXPECTED_TOTALS.SharedConversation &&
        totals.Conversation === EXPECTED_TOTALS.Conversation;

      const blob = {
        code_version: CODE_VERSION,
        pages_scanned: { conversations: convos.pages_scanned, messages: messages.pages_scanned, shared: shared.pages_scanned },
        capped: { conversations: convos.capped, messages: messages.capped, shared: shared.capped },
        totals,
        expected_totals: EXPECTED_TOTALS,
        baseline_match,
        conversations_total: convos.records.length,
        messages: countsOf(mClass),
        shared: { ...countsOf(sClass), title_copy: sClass.title_copy.length },
        fixture_checks: fixtures,
        has_metadata_unavailable: hasMetadataUnavailable,
        backfill_fingerprint: fingerprint,
      };

      await db.entities.AiDataRepairRun.update(run.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify(blob),
        summary: `dry_run v${CODE_VERSION}: msgs backfillable=${mClass.backfillable.length} anon_legacy=${mClass.anonymous_legacy.length} orphan=${mClass.orphan.length} meta_unavail=${mClass.owner_metadata_unavailable.length}; shared backfillable=${sClass.backfillable.length}; totals=${totals.Message}/${totals.SharedConversation}/${totals.Conversation} baseline_match=${baseline_match}; fixtures=${Object.values(fixtures).join("/")}; capped=${messages.capped || shared.capped || convos.capped}`,
      });

      return Response.json({
        action: "dry_run",
        run_id: run.id,
        code_version: CODE_VERSION,
        pages_scanned: blob.pages_scanned,
        capped: blob.capped,
        totals: blob.totals,
        expected_totals: blob.expected_totals,
        baseline_match: blob.baseline_match,
        conversations_total: blob.conversations_total,
        messages: blob.messages,
        shared: blob.shared,
        fixture_checks: blob.fixture_checks,
        has_metadata_unavailable: blob.has_metadata_unavailable,
        apply_blocked:
          blob.capped.messages || blob.capped.shared || blob.capped.conversations ||
          hasMetadataUnavailable || !baseline_match || !Object.values(fixtures).every(Boolean),
      });
    }

    if (action === "apply_verified") {
      if (body.confirmation_phrase !== CONFIRM_PHRASE) {
        return Response.json({ error: "Confirmation phrase required" }, { status: 400 });
      }
      if (!body.dry_run_id) {
        return Response.json({ error: "dry_run_id required" }, { status: 400 });
      }

      // Load and validate the bound dry-run.
      let runRows = [];
      try { runRows = await db.entities.AiDataRepairRun.filter({ id: body.dry_run_id }); } catch (_) {}
      const run = runRows && runRows[0];
      if (!run) return Response.json({ error: "dry-run not found" }, { status: 404 });
      if (run.action !== "dry_run") return Response.json({ error: "Not a dry-run record" }, { status: 400 });
      if (run.status !== "completed") return Response.json({ error: "dry-run not completed" }, { status: 409 });
      if ((run.summary || "").includes("| APPLIED")) return Response.json({ error: "dry-run already applied" }, { status: 409 });

      let stashed = null;
      try { stashed = JSON.parse(run.totals); } catch (_) {}
      if (!stashed) return Response.json({ error: "dry-run metadata missing" }, { status: 409 });
      if (stashed.code_version !== CODE_VERSION) {
        return Response.json({ error: "Stale dry-run (code version mismatch) — rerun dry_run" }, { status: 409 });
      }
      if (stashed.capped.messages || stashed.capped.shared || stashed.capped.conversations) {
        return Response.json({ error: "Pagination incomplete — rerun dry_run" }, { status: 409 });
      }
      if (stashed.has_metadata_unavailable) {
        return Response.json({ error: "owner_metadata_unavailable present — stamp parents before apply" }, { status: 409 });
      }
      if (stashed.baseline_match === false) {
        return Response.json({ error: "Baseline totals drifted — rerun dry_run" }, { status: 409 });
      }
      if (!Object.values(stashed.fixture_checks).every(Boolean)) {
        return Response.json({ error: "Fixture checks failed — rerun dry_run" }, { status: 409 });
      }

      // Reclassify fresh and compare to the stashed dry-run classification.
      const convos = await listAll(db, "Conversation");
      const convoById = {};
      for (const c of convos.records) convoById[c.id] = c;
      const messages = await listAll(db, "Message");
      const shared = await listAll(db, "SharedConversation");
      const mClass = classify(messages.records, convoById);
      const sClass = classifyShared(shared.records, convoById);
      const freshFingerprint = await backfillFingerprint([...mClass.backfillable, ...sClass.backfillable]);
      const freshMsgCounts = countsOf(mClass);
      const freshSharedCounts = countsOf(sClass);

      const freshTotals = {
        Message: messages.records.length,
        SharedConversation: shared.records.length,
        Conversation: convos.records.length,
      };
      const freshBaselineMatch =
        freshTotals.Message === EXPECTED_TOTALS.Message &&
        freshTotals.SharedConversation === EXPECTED_TOTALS.SharedConversation &&
        freshTotals.Conversation === EXPECTED_TOTALS.Conversation;

      const drifted =
        JSON.stringify(freshMsgCounts) !== JSON.stringify(stashed.messages) ||
        JSON.stringify({ ...freshSharedCounts, title_copy: sClass.title_copy.length }) !== JSON.stringify(stashed.shared) ||
        freshFingerprint !== stashed.backfill_fingerprint ||
        !freshBaselineMatch;
      if (drifted) {
        return Response.json({
          error: "Classification drifted between dry-run and apply — rerun dry_run",
          action: "apply_verified",
        }, { status: 409 });
      }

      const applyRun = await db.entities.AiDataRepairRun.create({
        action: "apply_verified", actor_email: user.email, status: "running",
        started_at: new Date().toISOString(),
      });

      let updatedMessages = 0, updatedShared = 0, titlesCopied = 0, quarantined = 0;

      if (mClass.backfillable.length > 0) {
        await db.entities.Message.bulkUpdate(
          mClass.backfillable.map(b => ({ id: b.id, owner_email: b.owner_email }))
        );
        updatedMessages = mClass.backfillable.length;
      }

      const sharedPatch = new Map();
      for (const b of sClass.backfillable) sharedPatch.set(b.id, { id: b.id, owner_email: b.owner_email });
      for (const t of sClass.title_copy) {
        const existing = sharedPatch.get(t.id) || { id: t.id };
        existing.title = t.title;
        sharedPatch.set(t.id, existing);
      }
      if (sharedPatch.size > 0) {
        await db.entities.SharedConversation.bulkUpdate([...sharedPatch.values()]);
        updatedShared = [...sharedPatch.values()].filter(p => p.owner_email).length;
        titlesCopied = [...sharedPatch.values()].filter(p => p.title).length;
      }

      // Quarantine true orphans / anonymous_legacy / conflicts (idempotent dedup by record_id).
      const candidates = [
        ...mClass.orphan.map(id => ({ entity_type: "Message", record_id: id, reason: "orphan_conversation" })),
        ...mClass.anonymous_legacy.map(id => ({ entity_type: "Message", record_id: id, reason: "anonymous_legacy" })),
        ...mClass.conflict.map(id => ({ entity_type: "Message", record_id: id, reason: "owner_email_conflict" })),
        ...sClass.orphan.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "orphan_conversation" })),
        ...sClass.anonymous_legacy.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "anonymous_legacy" })),
        ...sClass.conflict.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "owner_email_conflict" })),
      ];
      let existingQ = [];
      try { existingQ = await db.entities.AiDataQuarantine.filter({}); } catch (_) {}
      const existingIds = new Set(existingQ.map(q => q.record_id));
      for (const q of candidates) {
        if (existingIds.has(q.record_id)) continue;
        try {
          await db.entities.AiDataQuarantine.create({
            ...q, detected_at: new Date().toISOString(), resolved: false,
          });
          quarantined++;
        } catch (_) {}
      }

      const after = { messages_updated: updatedMessages, shared_updated: updatedShared, titles_copied: titlesCopied, quarantined };

      await db.entities.AiDataRepairRun.update(applyRun.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify({ applied_to_dry_run: run.id, after }),
        summary: `apply_verified v${CODE_VERSION}: +${updatedMessages} msg owner_email, +${updatedShared} shared owner_email, +${titlesCopied} titles, +${quarantined} quarantined`,
      });

      // Mark the bound dry-run as consumed so it cannot authorize a second apply.
      try {
        await db.entities.AiDataRepairRun.update(run.id, {
          summary: `${run.summary || ""} | APPLIED ${new Date().toISOString()}`,
        });
      } catch (_) {}

      return Response.json({ action: "apply_verified", run_id: applyRun.id, applied_to_dry_run: run.id, after });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}