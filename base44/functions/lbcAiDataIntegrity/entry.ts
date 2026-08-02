import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';

// Owner/admin-only data-integrity tool for LBC AI.
// Actions: dry_run (read-only counts), apply_verified (backfill owner_email,
// quarantine orphans/anon/conflicts; idempotent), status (latest runs).
// Never deletes records. Never assigns anonymous/orphan records to a human.
// No message content is stored in audit rows.

const CONFIRM_PHRASE = "REPAIR_VERIFIED_LBC_AI_DATA";
const PAGE_SIZE = 500;
const ANON_TOKENS = ["anonymous", "system", "service"];

function isHumanOwner(v) {
  if (!v || typeof v !== "string") return false;
  const lower = v.toLowerCase();
  if (ANON_TOKENS.some(t => lower === t || lower.startsWith(t))) return false;
  return v.includes("@");
}

// Paginate every record of an entity via created_date cursor (no skip offset drift).
async function listAll(db, entityName) {
  const all = [];
  const seen = new Set();
  let cursor = null;
  let guard = 0;
  while (guard < 500) {
    guard++;
    let batch;
    if (cursor) {
      batch = await db.entities[entityName].filter({ created_date: { $lt: cursor } }, "-created_date", PAGE_SIZE);
    } else {
      batch = await db.entities[entityName].list("-created_date", PAGE_SIZE);
    }
    if (!batch || batch.length === 0) break;
    const fresh = batch.filter(b => b && b.id && !seen.has(b.id));
    if (fresh.length === 0) break;
    for (const b of fresh) { seen.add(b.id); all.push(b); }
    cursor = batch[batch.length - 1].created_date;
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

function classifyMessages(messages, convoById) {
  const r = { backfillable: [], already_ok: [], orphan: [], anonymous_owner: [], conflict: [], total: messages.length };
  for (const m of messages) {
    const parent = convoById[m.conversation_id];
    if (!parent) { r.orphan.push(m.id); continue; }
    const owner = parent.created_by;
    if (!isHumanOwner(owner)) { r.anonymous_owner.push(m.id); continue; }
    if (m.owner_email && m.owner_email === owner) { r.already_ok.push(m.id); continue; }
    if (m.owner_email && m.owner_email !== owner) { r.conflict.push(m.id); continue; }
    r.backfillable.push({ id: m.id, owner_email: owner });
  }
  return r;
}

function classifyShared(shared, convoById) {
  const r = { backfillable: [], already_ok: [], orphan: [], anonymous_owner: [], conflict: [], title_copy: [], total: shared.length };
  for (const s of shared) {
    const parent = convoById[s.conversation_id];
    if (!parent) { r.orphan.push(s.id); continue; }
    const owner = parent.created_by;
    if (!isHumanOwner(owner)) { r.anonymous_owner.push(s.id); continue; }
    if (s.owner_email && s.owner_email === owner) { r.already_ok.push(s.id); }
    else if (s.owner_email && s.owner_email !== owner) { r.conflict.push(s.id); }
    else { r.backfillable.push({ id: s.id, owner_email: owner }); }
    if ((!s.title || s.title === "Synced conversation") && parent.title) {
      r.title_copy.push({ id: s.id, title: parent.title });
    }
  }
  return r;
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

      const conversations = await listAll(db, "Conversation");
      const convoById = {};
      for (const c of conversations) convoById[c.id] = c;

      const messages = await listAll(db, "Message");
      const shared = await listAll(db, "SharedConversation");
      const mClass = classifyMessages(messages, convoById);
      const sClass = classifyShared(shared, convoById);

      const totals = {
        conversations: conversations.length,
        messages: {
          total: mClass.total,
          backfillable: mClass.backfillable.length,
          already_ok: mClass.already_ok.length,
          orphan: mClass.orphan.length,
          anonymous_owner: mClass.anonymous_owner.length,
          conflict: mClass.conflict.length,
        },
        shared: {
          total: sClass.total,
          backfillable: sClass.backfillable.length,
          already_ok: sClass.already_ok.length,
          orphan: sClass.orphan.length,
          anonymous_owner: sClass.anonymous_owner.length,
          conflict: sClass.conflict.length,
          title_copy: sClass.title_copy.length,
        },
      };

      await db.entities.AiDataRepairRun.update(run.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify(totals),
        summary: `dry_run: ${mClass.backfillable.length} messages + ${sClass.backfillable.length} shared backfillable; ${mClass.orphan.length + sClass.orphan.length} orphans; ${mClass.anonymous_owner.length + sClass.anonymous_owner.length} anon/service; ${mClass.conflict.length + sClass.conflict.length} conflict`,
      });

      return Response.json({ action: "dry_run", run_id: run.id, totals });
    }

    if (action === "apply_verified") {
      if (body.confirmation_phrase !== CONFIRM_PHRASE) {
        return Response.json({ error: "Confirmation phrase required" }, { status: 400 });
      }

      const run = await db.entities.AiDataRepairRun.create({
        action: "apply_verified", actor_email: user.email, status: "running",
        started_at: new Date().toISOString(),
      });

      const conversations = await listAll(db, "Conversation");
      const convoById = {};
      for (const c of conversations) convoById[c.id] = c;

      const messages = await listAll(db, "Message");
      const shared = await listAll(db, "SharedConversation");
      const mClass = classifyMessages(messages, convoById);
      const sClass = classifyShared(shared, convoById);

      const before = {
        messages: {
          total: mClass.total, backfillable: mClass.backfillable.length,
          already_ok: mClass.already_ok.length, orphan: mClass.orphan.length,
          anonymous_owner: mClass.anonymous_owner.length, conflict: mClass.conflict.length,
        },
        shared: {
          total: sClass.total, backfillable: sClass.backfillable.length,
          already_ok: sClass.already_ok.length, orphan: sClass.orphan.length,
          anonymous_owner: sClass.anonymous_owner.length, conflict: sClass.conflict.length,
          title_copy: sClass.title_copy.length,
        },
      };

      let updatedMessages = 0, updatedShared = 0, titlesCopied = 0;

      // Backfill Message.owner_email (idempotent: only records lacking owner_email are backfillable)
      if (mClass.backfillable.length > 0) {
        await db.entities.Message.bulkUpdate(
          mClass.backfillable.map(b => ({ id: b.id, owner_email: b.owner_email }))
        );
        updatedMessages = mClass.backfillable.length;
      }

      // Backfill SharedConversation.owner_email + generic title copy (merged per record)
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

      // Quarantine orphans / anonymous / conflicts (idempotent: skip already-quarantined record_ids)
      const quarantineCandidates = [
        ...mClass.orphan.map(id => ({ entity_type: "Message", record_id: id, reason: "orphan_conversation" })),
        ...mClass.anonymous_owner.map(id => ({ entity_type: "Message", record_id: id, reason: "anonymous_or_service_owner" })),
        ...mClass.conflict.map(id => ({ entity_type: "Message", record_id: id, reason: "owner_email_conflict" })),
        ...sClass.orphan.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "orphan_conversation" })),
        ...sClass.anonymous_owner.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "anonymous_or_service_owner" })),
        ...sClass.conflict.map(id => ({ entity_type: "SharedConversation", record_id: id, reason: "owner_email_conflict" })),
      ];
      let existingQ = [];
      try { existingQ = await db.entities.AiDataQuarantine.filter({}); } catch (_) {}
      const existingIds = new Set(existingQ.map(q => q.record_id));
      let quarantined = 0;
      for (const q of quarantineCandidates) {
        if (existingIds.has(q.record_id)) continue;
        try {
          await db.entities.AiDataQuarantine.create({
            ...q, detected_at: new Date().toISOString(), resolved: false,
          });
          quarantined++;
        } catch (_) {}
      }

      const after = {
        messages_updated: updatedMessages,
        shared_updated: updatedShared,
        titles_copied: titlesCopied,
        quarantined,
      };

      await db.entities.AiDataRepairRun.update(run.id, {
        status: "completed",
        finished_at: new Date().toISOString(),
        totals: JSON.stringify({ before, after }),
        summary: `apply_verified: +${updatedMessages} msg owner_email, +${updatedShared} shared owner_email, +${titlesCopied} titles, +${quarantined} quarantined`,
      });

      return Response.json({ action: "apply_verified", run_id: run.id, before, after });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}