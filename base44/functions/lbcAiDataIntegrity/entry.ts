import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireFounderOrAdmin, errorResponse, sha256Hex } from '../../shared/security.ts';
import {
  isHumanEmail, classifyParent, splitCohort,
  BASELINE_CUTOFF, BASELINE_TOTALS, DRIFT_CONFIRM_PHRASE, DRIFT_TARGETS,
  verifyDriftTargets, planDriftApply,
} from '../../shared/integrity.ts';

// Owner/admin-only data-integrity tool for LBC AI.
// Actions: status, dry_run, apply_verified (baseline cohort), post_baseline_drift_fix.
//
// HARD RULES:
//  - Never deletes records.
//  - The reviewed historical migration cohort (80 Conversation / 954 Message /
//    48 SharedConversation) is a FIXED baseline. Records created at or after
//    BASELINE_CUTOFF are post-baseline and reported as a separate delta — the
//    baseline is never weakened and expected totals are never silently changed.
//  - Classification / backfill / quarantine operate on the BASELINE cohort only.
//    Post-baseline drift is repaired exclusively by the hash-bound
//    `post_baseline_drift_fix` action.
//  - Parent ownership is classified ONLY from explicit Conversation fields:
//    `owner_email` + `ownership_state` (externally stamped). A bare owner_email
//    without the stamp is NOT trusted (no browser identity trust).
//  - apply_verified is bound to a fresh completed dry_run from THIS code
//    version, with pagination complete, fixture checks passing, baseline
//    cohort intact, no metadata-unavailable in the baseline cohort, and the
//    exact confirmation phrase. It reclassifies before writes and aborts on
//    any drift in baseline totals or owner mapping.
//  - post_baseline_drift_fix targets exactly the post-baseline drift IDs,
//    verifies created_by/session evidence + expected null fields + parent/child
//    relationships, aborts on drift, applies only missing ownership fields, is
//    hash-bound to a one-time dry_run, and requires a separate confirmation
//    phrase. It is NOT executed here automatically.
//  - Anonymous-legacy parents (15) and their 24 messages stay unassigned and
//    excluded from normal user views; never deleted or reassigned.
//  - No message content is stored in audit rows; fixture checks are booleans.

const CODE_VERSION = "lbc_ai_integrity_v4_20260802";
const CONFIRM_PHRASE = "REPAIR_VERIFIED_LBC_AI_DATA";
const BATCH = 5000;

const FIXTURES = [
  { id: "6a400735ed9c0b8c2b42ebd4", key: "fixture_6a400735_human" },
  { id: "6a13be31ab1dfe8d5ca391f4", key: "fixture_6a13be31_human" },
];

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

function baselineMatchOf(baselineTotals) {
  return baselineTotals.Message === BASELINE_TOTALS.Message &&
    baselineTotals.SharedConversation === BASELINE_TOTALS.SharedConversation &&
    baselineTotals.Conversation === BASELINE_TOTALS.Conversation;
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
        baseline_totals: BASELINE_TOTALS,
        baseline_cutoff: BASELINE_CUTOFF,
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

      // Baseline cohort = records created strictly before the migration cutoff.
      const cCohort = splitCohort(convos.records, BASELINE_CUTOFF);
      const mCohort = splitCohort(messages.records, BASELINE_CUTOFF);
      const sCohort = splitCohort(shared.records, BASELINE_CUTOFF);

      // Classification runs on the baseline cohort only — post-baseline drift
      // is not classified/quarantined/backfilled here.
      const mClass = classify(mCohort.baseline, convoById);
      const sClass = classifyShared(sCohort.baseline, convoById);

      const fixtures = await fixtureChecks(db);
      const hasMetadataUnavailable =
        mClass.owner_metadata_unavailable.length > 0 || sClass.owner_metadata_unavailable.length > 0;

      const fingerprint = await backfillFingerprint([
        ...mClass.backfillable,
        ...sClass.backfillable,
      ]);

      const baseline_totals = {
        Message: mCohort.baseline.length,
        SharedConversation: sCohort.baseline.length,
        Conversation: cCohort.baseline.length,
      };
      const post_baseline_totals = {
        Message: mCohort.postBaseline.length,
        SharedConversation: sCohort.postBaseline.length,
        Conversation: cCohort.postBaseline.length,
      };
      const total_counts = {
        Message: messages.records.length,
        SharedConversation: shared.records.length,
        Conversation: convos.records.length,
      };
      const baseline_match = baselineMatchOf(baseline_totals);

      const blob = {
        code_version: CODE_VERSION,
        pages_scanned: { conversations: convos.pages_scanned, messages: messages.pages_scanned, shared: shared.pages_scanned },
        capped: { conversations: convos.capped, messages: messages.capped, shared: shared.capped },
        baseline_totals,
        post_baseline_totals,
        total_counts,
        baseline_match,
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
        summary: `dry_run v${CODE_VERSION}: baseline=${baseline_totals.Conversation}/${baseline_totals.Message}/${baseline_totals.SharedConversation} match=${baseline_match}; post-baseline=${post_baseline_totals.Conversation}/${post_baseline_totals.Message}/${post_baseline_totals.SharedConversation}; msgs backfillable=${mClass.backfillable.length} anon=${mClass.anonymous_legacy.length} orphan=${mClass.orphan.length} meta=${mClass.owner_metadata_unavailable.length}; shared backfillable=${sClass.backfillable.length}; fixtures=${Object.values(fixtures).join("/")}; capped=${messages.capped || shared.capped || convos.capped}`,
      });

      return Response.json({
        action: "dry_run",
        run_id: run.id,
        code_version: CODE_VERSION,
        pages_scanned: blob.pages_scanned,
        capped: blob.capped,
        baseline_totals,
        post_baseline_totals,
        total_counts,
        baseline_match,
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
        return Response.json({ error: "owner_metadata_unavailable present in baseline — stamp parents before apply" }, { status: 409 });
      }
      if (stashed.baseline_match === false) {
        return Response.json({ error: "Baseline cohort drifted — rerun dry_run" }, { status: 409 });
      }
      if (!Object.values(stashed.fixture_checks).every(Boolean)) {
        return Response.json({ error: "Fixture checks failed — rerun dry_run" }, { status: 409 });
      }

      // Reclassify the baseline cohort fresh and compare to the stashed dry-run.
      const convos = await listAll(db, "Conversation");
      const convoById = {};
      for (const c of convos.records) convoById[c.id] = c;
      const messages = await listAll(db, "Message");
      const shared = await listAll(db, "SharedConversation");
      const cCohort = splitCohort(convos.records, BASELINE_CUTOFF);
      const mCohort = splitCohort(messages.records, BASELINE_CUTOFF);
      const sCohort = splitCohort(shared.records, BASELINE_CUTOFF);
      const mClass = classify(mCohort.baseline, convoById);
      const sClass = classifyShared(sCohort.baseline, convoById);
      const freshFingerprint = await backfillFingerprint([...mClass.backfillable, ...sClass.backfillable]);
      const freshMsgCounts = countsOf(mClass);
      const freshSharedCounts = countsOf(sClass);
      const freshBaselineTotals = {
        Message: mCohort.baseline.length,
        SharedConversation: sCohort.baseline.length,
        Conversation: cCohort.baseline.length,
      };

      const drifted =
        JSON.stringify(freshMsgCounts) !== JSON.stringify(stashed.messages) ||
        JSON.stringify({ ...freshSharedCounts, title_copy: sClass.title_copy.length }) !== JSON.stringify(stashed.shared) ||
        freshFingerprint !== stashed.backfill_fingerprint ||
        JSON.stringify(freshBaselineTotals) !== JSON.stringify(stashed.baseline_totals) ||
        !baselineMatchOf(freshBaselineTotals);
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

      const msgPatches = mClass.backfillable.map(b => ({ id: b.id, owner_email: b.owner_email }));
      for (let i = 0; i < msgPatches.length; i += 500) {
        const slice = msgPatches.slice(i, i + 500);
        if (slice.length > 0) await db.entities.Message.bulkUpdate(slice);
      }
      updatedMessages = msgPatches.length;

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

      // Quarantine true orphans + conflicts only (baseline cohort).
      // Anonymous-legacy records are intentionally skipped — left in place,
      // not quarantined, not reassigned.
      const candidates = [
        ...mClass.orphan.map(id => ({ entity_type: "Message", record_id: id, reason: "orphan_conversation" })),
        ...mClass.conflict.map(id => ({ entity_type: "Message", record_id: id, reason: "owner_email_conflict" })),
        ...sClass.orphan.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "orphan_conversation" })),
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

      try {
        await db.entities.AiDataRepairRun.update(run.id, {
          summary: `${run.summary || ""} | APPLIED ${new Date().toISOString()}`,
        });
      } catch (_) {}

      return Response.json({ action: "apply_verified", run_id: applyRun.id, applied_to_dry_run: run.id, after });
    }

    if (action === "post_baseline_drift_fix") {
      const phase = body.phase || "dry_run";

      if (phase === "dry_run") {
        const run = await db.entities.AiDataRepairRun.create({
          action: "post_baseline_drift_dry_run", actor_email: user.email, status: "running",
          started_at: new Date().toISOString(),
        });

        const convo = (await db.entities.Conversation.filter({ id: DRIFT_TARGETS.conversation.id }))[0] || null;
        const msgs = [];
        for (const tm of DRIFT_TARGETS.messages) {
          msgs.push((await db.entities.Message.filter({ id: tm.id }))[0] || null);
        }
        const shared = (await db.entities.SharedConversation.filter({ id: DRIFT_TARGETS.shared.id }))[0] || null;

        // created_by/session evidence: a successful user-scoped read under RLS
        // (created_by == user.email) proves the authenticated actor owns the
        // drift conversation.
        let actorOwnsConversation = false;
        try {
          const scoped = await base44.entities.Conversation.filter({ id: DRIFT_TARGETS.conversation.id });
          actorOwnsConversation = !!(scoped && scoped.length > 0);
        } catch (_) { actorOwnsConversation = false; }

        const verification = verifyDriftTargets({ convo, messages: msgs, shared, actorOwnsConversation });
        const manifestHash = await sha256Hex(JSON.stringify(DRIFT_TARGETS));
        const plan = planDriftApply({ convo, shared });

        const blob = {
          code_version: CODE_VERSION,
          phase: "dry_run",
          manifest_hash: manifestHash,
          verification,
          plan,
          actor_email: user.email,
        };

        await db.entities.AiDataRepairRun.update(run.id, {
          status: "completed",
          finished_at: new Date().toISOString(),
          totals: JSON.stringify(blob),
          summary: `post_baseline_drift dry_run v${CODE_VERSION}: ok=${verification.ok} reasons=${verification.reasons.join(",") || "none"} actor_owns=${actorOwnsConversation}`,
        });

        return Response.json({
          action: "post_baseline_drift_fix",
          phase: "dry_run",
          run_id: run.id,
          verification,
          manifest_hash: manifestHash,
          plan,
          apply_blocked: !verification.ok,
        });
      }

      if (phase === "apply") {
        if (body.confirmation_phrase !== DRIFT_CONFIRM_PHRASE) {
          return Response.json({ error: "Drift confirmation phrase required" }, { status: 400 });
        }
        if (!body.dry_run_id) {
          return Response.json({ error: "dry_run_id required" }, { status: 400 });
        }

        let runRows = [];
        try { runRows = await db.entities.AiDataRepairRun.filter({ id: body.dry_run_id }); } catch (_) {}
        const run = runRows && runRows[0];
        if (!run) return Response.json({ error: "dry-run not found" }, { status: 404 });
        if (run.action !== "post_baseline_drift_dry_run") return Response.json({ error: "Not a drift dry-run record" }, { status: 400 });
        if (run.status !== "completed") return Response.json({ error: "dry-run not completed" }, { status: 409 });
        if ((run.summary || "").includes("| APPLIED")) return Response.json({ error: "dry-run already applied" }, { status: 409 });

        let stashed = null;
        try { stashed = JSON.parse(run.totals); } catch (_) {}
        if (!stashed) return Response.json({ error: "dry-run metadata missing" }, { status: 409 });
        if (stashed.code_version !== CODE_VERSION) {
          return Response.json({ error: "Stale drift dry-run (code version mismatch)" }, { status: 409 });
        }
        const freshManifestHash = await sha256Hex(JSON.stringify(DRIFT_TARGETS));
        if (stashed.manifest_hash !== freshManifestHash) {
          return Response.json({ error: "Drift manifest hash mismatch — targets changed" }, { status: 409 });
        }

        // Re-verify fresh state (drift check).
        const convo = (await db.entities.Conversation.filter({ id: DRIFT_TARGETS.conversation.id }))[0] || null;
        const msgs = [];
        for (const tm of DRIFT_TARGETS.messages) {
          msgs.push((await db.entities.Message.filter({ id: tm.id }))[0] || null);
        }
        const shared = (await db.entities.SharedConversation.filter({ id: DRIFT_TARGETS.shared.id }))[0] || null;
        let actorOwnsConversation = false;
        try {
          const scoped = await base44.entities.Conversation.filter({ id: DRIFT_TARGETS.conversation.id });
          actorOwnsConversation = !!(scoped && scoped.length > 0);
        } catch (_) { actorOwnsConversation = false; }
        const freshVerification = verifyDriftTargets({ convo, messages: msgs, shared, actorOwnsConversation });
        if (!freshVerification.ok) {
          return Response.json({ error: "Drift verification failed — state changed", verification: freshVerification }, { status: 409 });
        }

        const applyRun = await db.entities.AiDataRepairRun.create({
          action: "post_baseline_drift_apply", actor_email: user.email, status: "running",
          started_at: new Date().toISOString(),
        });

        const plan = planDriftApply({ convo, shared });
        let conversationUpdated = 0, sharedUpdated = 0, messagesUpdated = 0;

        if (plan.conversation) {
          await db.entities.Conversation.update(plan.conversation.id, {
            owner_email: plan.conversation.owner_email,
            ownership_state: plan.conversation.ownership_state,
          });
          conversationUpdated = 1;
        }
        if (plan.shared) {
          await db.entities.SharedConversation.update(plan.shared.id, {
            owner_email: plan.shared.owner_email,
          });
          sharedUpdated = 1;
        }
        // Messages already carry the server-stamped owner_email — apply only
        // missing fields, so none are written here.

        await db.entities.AiDataRepairRun.update(applyRun.id, {
          status: "completed",
          finished_at: new Date().toISOString(),
          totals: JSON.stringify({ applied_to_dry_run: run.id, after: { conversationUpdated, sharedUpdated, messagesUpdated } }),
          summary: `post_baseline_drift apply v${CODE_VERSION}: convo=${conversationUpdated} shared=${sharedUpdated} msgs=${messagesUpdated}`,
        });

        try {
          await db.entities.AiDataRepairRun.update(run.id, {
            summary: `${run.summary || ""} | APPLIED ${new Date().toISOString()}`,
          });
        } catch (_) {}

        return Response.json({
          action: "post_baseline_drift_fix",
          phase: "apply",
          run_id: applyRun.id,
          applied_to_dry_run: run.id,
          after: { conversationUpdated, sharedUpdated, messagesUpdated },
        });
      }

      return Response.json({ error: "Unknown phase — use dry_run or apply" }, { status: 400 });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}