import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getUserPlan } from '../../shared/tiers.ts';
import { publicRegistry } from '../../shared/autopilotRegistry.ts';
import { planTask, preflight, runOneStep, auditEntry, MAX_STEPS } from '../../shared/autopilotEngine.ts';
import {
  ACTION_KINDS, DESTINATIONS, destinationUsable, publicDestinations,
  validateFields, draftHash, draftCopy, dispatchAction, APPROVAL_TTL_MS,
} from '../../shared/autopilotActions.ts';
import { isAdmin, randomToken } from '../../shared/security.ts';

// LBC AI Autopilot — one authenticated server-side task orchestrator.
// Identity is ALWAYS auth.me(); no client-supplied user/owner ids are read.
// Run records are server-write-only (RLS); the service role is used only after
// an explicit owner_user_id match on every access.
const MAX_GOAL_CHARS = 3000;
const MAX_DOCS = 5;
const DAILY_LIMIT = { free: 5, superagent: 20, ultra: 40 };
const MAX_ATTACHMENTS = 4;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const plan = await getUserPlan(base44, user);

    if (action === 'capabilities') {
      return Response.json({ plan, capabilities: publicRegistry(), destinations: publicDestinations(isAdmin(user)) });
    }

    if (action === 'get_mode') {
      const rows = await base44.entities.AutopilotPreference.filter({ owner_user_id: user.id }).catch(() => []);
      return Response.json({ enabled: !!rows[0]?.enabled });
    }
    if (action === 'set_mode') {
      const enabled = !!body.enabled;
      await db.entities.AutopilotPreference.updateMany(
        { owner_user_id: user.id }, { $set: { enabled, changed_at: new Date().toISOString() } }
      ).catch(() => {});
      if (!enabled) {
        // Turning off stops new work and background continuation of pending
        // runs. Already-completed external actions are never undone.
        const open = await db.entities.AutopilotRun.filter(
          { owner_user_id: user.id, status: 'running' }, 'created_date', 20
        ).catch(() => []);
        await Promise.all(open.map(r => db.entities.AutopilotRun.update(r.id, {
          status: 'paused', lease_until: null,
          audit: [...(r.audit || []), auditEntry('paused', 'Persistent mode turned off — resume in the Autopilot screen')],
        })));
      }
      return Response.json({ enabled });
    }

    const loadOwned = async () => {
      if (typeof body.run_id !== 'string' || !body.run_id) return null;
      const rows = await db.entities.AutopilotRun.filter({ id: body.run_id, owner_user_id: user.id }).catch(() => []);
      return rows?.[0] || null;
    };
    const loadCtx = async (run) => {
      let agent = null;
      if (run.agent_id) {
        agent = (await base44.entities.UserAgent.filter({ id: run.agent_id }).catch(() => []))?.[0] || null;
      }
      const docs = run.document_ids?.length
        ? await base44.entities.Document.filter({ id: { $in: run.document_ids }, status: 'ready' }).catch(() => [])
        : [];
      return { ownerId: user.id, agent, docs, userClient: base44 };
    };
    const startExecution = async (run) => {
      await db.entities.AutopilotRun.update(run.id, {
        status: 'running', lease_until: null,
        audit: [...(run.audit || []), auditEntry('started', 'Execution started')],
      });
    };
    const planAndStore = async (run, clarification) => {
      const docs = (await loadCtx(run)).docs;
      const p = await planTask(db, { goal: run.goal, docTitles: docs.map(d => d.title), clarification });
      if (p.needs_clarification && !clarification) {
        return db.entities.AutopilotRun.update(run.id, { status: 'awaiting_input', clarifying_question: p.clarifying_question, audit: [...(run.audit || []), auditEntry('clarify', 'Asked a clarifying question')] });
      }
      const blocked = preflight(p.steps, plan, docs.length > 0);
      return db.entities.AutopilotRun.update(run.id, {
        status: blocked ? 'blocked' : 'queued', blocked_reason: blocked || null,
        plan_summary: p.plan_summary, steps: p.steps, clarifying_question: null,
        audit: [...(run.audit || []), auditEntry(blocked ? 'blocked' : 'planned', blocked || `${p.steps.length} steps`)],
      });
    };

    if (action === 'create') {
      const goal = typeof body.goal === 'string' ? body.goal.trim().slice(0, MAX_GOAL_CHARS) : '';
      if (goal.length < 5) return Response.json({ error: 'Describe The Task In A Few Words' }, { status: 400 });

      const startIso = new Date(new Date().toISOString().slice(0, 10)).toISOString();
      const today = await db.entities.AutopilotRun.filter({ owner_user_id: user.id, created_date: { $gte: startIso } }, 'created_date', 100).catch(() => []);
      if (today.length >= (DAILY_LIMIT[plan] || 5)) return Response.json({ error: 'Daily Autopilot Limit Reached' }, { status: 429 });
      if (today.some(r => r.status === 'running')) return Response.json({ error: 'One Autopilot Task Is Already Running' }, { status: 429 });

      let agentId = null;
      if (typeof body.agent_id === 'string' && body.agent_id) {
        const a = (await base44.entities.UserAgent.filter({ id: body.agent_id }).catch(() => []))?.[0];
        if (!a || a.status === 'archived') return Response.json({ error: 'Not found' }, { status: 404 });
        agentId = a.id;
      }
      const requested = Array.isArray(body.document_ids) ? body.document_ids.filter(x => typeof x === 'string').slice(0, MAX_DOCS) : [];
      const owned = requested.length ? await base44.entities.Document.filter({ id: { $in: requested } }).catch(() => []) : [];
      if (owned.length !== requested.length) return Response.json({ error: 'Not found' }, { status: 404 });

      const run = await db.entities.AutopilotRun.create({
        owner_user_id: user.id, agent_id: agentId, goal, document_ids: owned.map(d => d.id),
        status: 'queued', steps: [], audit: [auditEntry('created', 'Task received')],
      });
      await planAndStore(run, null);
      const fresh = (await db.entities.AutopilotRun.filter({ id: run.id, owner_user_id: user.id }))[0];
      if (fresh.status === 'queued') await startExecution(fresh);
      return Response.json({ run_id: run.id });
    }

    // --- External-action pipeline: draft -> preview -> approve -> dispatch.
    if (action === 'draft_action') {
      const kind = ACTION_KINDS.includes(body.kind) ? body.kind : '';
      if (!kind) return Response.json({ error: 'Choose A Post Or A Listing' }, { status: 400 });
      if (typeof body.destination_id !== 'string') return Response.json({ error: 'Choose A Destination' }, { status: 400 });
      const guard = destinationUsable(body.destination_id, kind, isAdmin(user));
      if (guard) return Response.json({ error: guard, needs_connection: true }, { status: 402 });

      const attachments = Array.isArray(body.attachments)
        ? body.attachments.filter(a => typeof a === 'string' && a.startsWith('files/')).slice(0, MAX_ATTACHMENTS) : [];
      const { fields, missing, errors } = validateFields(kind, body.fields || {}, attachments);
      if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });
      if (missing.length) return Response.json({ error: 'Missing Required Fields', missing }, { status: 400 });

      // Signed URLs for caption grounding — used as untrusted evidence only.
      const imageUrls = [];
      for (const uri of attachments) {
        const signed = await db.integrations.Core.CreateFileSignedUrl({ file_uri: uri }).catch(() => null);
        if (signed?.signed_url) imageUrls.push(signed.signed_url);
      }
      const copy = await draftCopy(db, kind, fields, imageUrls);
      if (!copy) return Response.json({ error: 'The Draft Could Not Be Generated — Please Try Again.' }, { status: 502 });

      const draft = { kind, destination_id: body.destination_id, destination_label: DESTINATIONS[body.destination_id].label, fields, copy, attachments };
      const hash = await draftHash(draft);
      const goal = kind === 'social_post' ? `Social post: ${fields.text || 'photo post'}` : `Marketplace listing: ${fields.item}`;
      const run = await db.entities.AutopilotRun.create({
        owner_user_id: user.id, kind, goal, document_ids: [], steps: [],
        status: 'awaiting_approval', action_draft: draft,
        approval: { content_hash: hash, expires_at: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(), used_at: null, claim: null },
        blocked_reason: null, plan_summary: null, clarifying_question: null,
        audit: [auditEntry('created', 'Task received'), auditEntry('drafted', `Preview ready for ${draft.destination_label}`)],
      });
      return Response.json({ run_id: run.id });
    }

    if (action === 'edit_draft') {
      const run = await loadOwned();
      if (!run || run.kind === 'task') return Response.json({ error: 'Not found' }, { status: 404 });
      if (run.receipt?.verified) return Response.json({ error: 'This Action Is Already Sent' }, { status: 409 });
      const draft = run.action_draft;
      const attachments = Array.isArray(body.attachments)
        ? body.attachments.filter(a => typeof a === 'string' && a.startsWith('files/')).slice(0, MAX_ATTACHMENTS)
        : (draft?.attachments || []);
      const { fields, missing, errors } = validateFields(draft.kind, body.fields || draft.fields || {}, attachments);
      if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });
      if (missing.length) return Response.json({ error: 'Missing Required Fields', missing }, { status: 400 });
      const imageUrls = [];
      for (const uri of attachments) {
        const signed = await db.integrations.Core.CreateFileSignedUrl({ file_uri: uri }).catch(() => null);
        if (signed?.signed_url) imageUrls.push(signed.signed_url);
      }
      const copy = await draftCopy(db, draft.kind, fields, imageUrls);
      const newDraft = { ...draft, fields, copy: copy || draft.copy, attachments };
      const hash = await draftHash(newDraft);
      await db.entities.AutopilotRun.update(run.id, {
        action_draft: newDraft, approval: { content_hash: hash, expires_at: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(), used_at: null, claim: null },
        audit: [...(run.audit || []), auditEntry('edited', 'Draft changed — prior approval invalidated')],
      });
      return Response.json({ ok: true });
    }

    if (action === 'approve') {
      const run = await loadOwned();
      if (!run || run.kind === 'task') return Response.json({ error: 'Not found' }, { status: 404 });
      if (run.receipt?.verified) {
        // Idempotent replay: return the already-verified receipt.
        return Response.json({ ok: true, receipt: run.receipt, status: 'completed' });
      }
      if (run.status !== 'awaiting_approval' && run.status !== 'blocked') {
        return Response.json({ error: 'Not Awaiting Approval' }, { status: 409 });
      }
      const app = run.approval || {};
      const draft = run.action_draft;
      const hash = await draftHash(draft);
      if (app.content_hash !== hash) return Response.json({ error: 'The Draft Changed Since You Reviewed It — Please Re-Review.' }, { status: 409 });
      if (app.used_at || app.claim) return Response.json({ error: 'This Approval Was Already Used Or Changed.' }, { status: 409 });
      if (!app.expires_at || new Date(app.expires_at).getTime() < Date.now()) {
        return Response.json({ error: 'Approval Expired — Please Re-Review The Draft.' }, { status: 409 });
      }
      // Destination is re-checked at approval time — auth may have changed.
      const guard = destinationUsable(draft.destination_id, draft.kind, isAdmin(user));
      if (guard) return Response.json({ error: guard, needs_connection: true }, { status: 402 });

      const claim = randomToken(16);
      await db.entities.AutopilotRun.update(run.id, { status: 'running', approval: { ...app, claim }, lease_until: new Date(Date.now() + 120000).toISOString(), audit: [...(run.audit || []), auditEntry('approved', `Approval bound to the exact draft (${hash.slice(0, 10)})`)] });
      let receipt;
      try {
        receipt = await dispatchAction(draft, hash);
      } catch (e) {
        await db.entities.AutopilotRun.update(run.id, {
          status: 'blocked', lease_until: null,
          blocked_reason: e?.message === 'no_adapter' ? 'Integration Required: No Authorized Handler For This Destination.' : 'Destination Not Available',
          audit: [...(run.audit || []), auditEntry('dispatch_failed', e?.message || 'no adapter')],
        });
        return Response.json({ error: 'Integration Required', needs_connection: true }, { status: 402 });
      }
      await db.entities.AutopilotRun.update(run.id, {
        status: 'completed', receipt: { ...receipt, verified: true },
        approval: { ...app, claim, used_at: new Date().toISOString() }, lease_until: null,
        final_summary: receipt.mock ? 'Sent Through The Test Sandbox (Mock) — Nothing Was Published.' : `Published: ${receipt.url || receipt.external_id}`,
        audit: [...(run.audit || []), auditEntry('dispatched', `Receipt verified: ${receipt.provider}`)],
      });
      return Response.json({ ok: true, receipt, status: 'completed' });
    }

    const run = await loadOwned();
    if (!run) return Response.json({ error: 'Not found' }, { status: 404 });

    if (action === 'step') {
      const result = await runOneStep(db, run.id, await loadCtx(run));
      return Response.json(result);
    }
    if (action === 'answer') {
      if (run.status !== 'awaiting_input') return Response.json({ error: 'Not Awaiting Input' }, { status: 409 });
      const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 1000) : '';
      if (!answer) return Response.json({ error: 'Answer Required' }, { status: 400 });
      await planAndStore(run, answer);
      const fresh = await loadOwned();
      if (fresh.status === 'queued') await startExecution(fresh);
      return Response.json({ ok: true });
    }
    if (action === 'cancel') {
      if (['completed', 'cancelled'].includes(run.status)) return Response.json({ error: 'Already Finished' }, { status: 409 });
      await db.entities.AutopilotRun.update(run.id, { status: 'cancelled', lease_until: null, audit: [...(run.audit || []), auditEntry('cancelled', 'Cancelled by owner; completed steps are kept')] });
      return Response.json({ ok: true });
    }
    if (action === 'pause') {
      if (run.status !== 'running') return Response.json({ error: 'Not Running' }, { status: 409 });
      await db.entities.AutopilotRun.update(run.id, { status: 'paused', audit: [...(run.audit || []), auditEntry('paused', 'Paused after current step')] });
      return Response.json({ ok: true });
    }
    if (action === 'resume' || action === 'retry') {
      const allowed = action === 'resume' ? ['paused'] : ['failed'];
      if (!allowed.includes(run.status)) return Response.json({ error: 'Cannot ' + action }, { status: 409 });
      if (run.lease_until && new Date(run.lease_until).getTime() > Date.now()) return Response.json({ error: 'Still Finishing A Step' }, { status: 409 });
      let steps = run.steps;
      if (action === 'retry') {
        if (steps.some(s => s.status === 'failed' && (s.attempts || 0) >= 2)) return Response.json({ error: 'Retry Limit Reached' }, { status: 429 });
        steps = steps.map(s => (s.status === 'failed' || s.status === 'running' ? { ...s, status: 'pending', error: null } : s));
      }
      await db.entities.AutopilotRun.update(run.id, { steps: steps.slice(0, MAX_STEPS) });
      await startExecution({ ...run, steps });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong — Please Try Again' }, { status: 500 });
  }
}