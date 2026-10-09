import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { getUserPlan } from '../../shared/tiers.ts';
import { publicRegistry } from '../../shared/autopilotRegistry.ts';
import { planTask, preflight, runOneStep, auditEntry, MAX_STEPS } from '../../shared/autopilotEngine.ts';
import {
  ACTION_KINDS, EMAIL_KINDS, DESTINATIONS, GMAIL_CONNECTOR_ID,
  destinationUsable, publicDestinations, publicAccounts,
  validateFields, draftHash, draftCopy, checkApproval, dispatchAction, APPROVAL_TTL_MS,
} from '../../shared/autopilotActions.ts';
import { isAdmin, randomToken } from '../../shared/security.ts';

// LBC AI Autopilot — one authenticated server-side task orchestrator.
// Identity is ALWAYS auth.me(); no client-supplied user/owner ids are read.
// Run records are server-write-only (RLS); the service role is used only after
// an explicit owner_user_id match on every access.
//
// Dispatch model: external writes ONLY happen inside the 'approve' action —
// the owner's own live session supplies their OAuth token (foreground).
// Background dispatch is structurally impossible (no offline per-user grant
// exists) and is never simulated.
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

    // Live probe of THIS user's own Gmail APP_USER connection. Returns only a
    // boolean — tokens are never stored, logged, or sent to the client.
    const probeGmail = async () => {
      try {
        const c = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
        return !!c?.accessToken;
      } catch (_) {
        return false;
      }
    };

    if (action === 'capabilities') {
      return Response.json({ plan, capabilities: publicRegistry(), destinations: publicDestinations(isAdmin(user)) });
    }

    if (action === 'accounts') {
      const gmailConnected = plan === 'ultra' ? await probeGmail() : false;
      return Response.json({ plan, accounts: publicAccounts({ gmailConnected, plan }) });
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
          status: 'paused', lease_until: null, lease_token: null,
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
      // Gmail token: live from THIS user's own connection, foreground only.
      const needsGmail = (run.steps || []).some(s =>
        ['email.send', 'email.draft', 'email.read'].includes(s.capability_id) &&
        (s.status === 'pending' || s.status === 'running'));
      let gmailToken = null;
      if (needsGmail) {
        try {
          const c = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
          gmailToken = c?.accessToken || null;
        } catch (_) {}
      }
      return { ownerId: user.id, agent, docs, userClient: base44, gmailToken };
    };
    const startExecution = async (run) => {
      await db.entities.AutopilotRun.update(run.id, {
        status: 'running', lease_until: null, lease_token: null,
        audit: [...(run.audit || []), auditEntry('started', 'Execution started')],
      });
    };
    const planAndStore = async (run, clarification) => {
      const docs = (await loadCtx(run)).docs;
      const p = await planTask(db, { goal: run.goal, docTitles: docs.map(d => d.title), clarification });
      if (p.needs_clarification && !clarification) {
        return db.entities.AutopilotRun.update(run.id, { status: 'awaiting_input', clarifying_question: p.clarifying_question, audit: [...(run.audit || []), auditEntry('clarify', 'Asked a clarifying question')] });
      }
      const blocked = preflight(p.steps, plan, docs.length > 0, { gmailConnected: await probeGmail() });
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
      if (!kind) return Response.json({ error: 'Choose A Post, A Listing, Or An Email' }, { status: 400 });
      if (typeof body.destination_id !== 'string') return Response.json({ error: 'Choose A Destination' }, { status: 400 });

      const isEmail = EMAIL_KINDS.includes(kind);
      const gmailConnected = isEmail ? await probeGmail() : false;
      const guard = destinationUsable(body.destination_id, kind, isAdmin(user), { plan, gmailConnected });
      if (guard) return Response.json({ error: guard, needs_connection: true }, { status: 402 });

      const attachments = isEmail ? [] : (Array.isArray(body.attachments)
        ? body.attachments.filter(a => typeof a === 'string' && a.startsWith('files/')).slice(0, MAX_ATTACHMENTS) : []);
      const { fields, missing, errors } = validateFields(kind, body.fields || {}, attachments);
      if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });
      if (missing.length) return Response.json({ error: 'Missing Required Fields', missing }, { status: 400 });

      let copy;
      if (isEmail) {
        // The user's exact content — email text is never silently rewritten.
        copy = fields.body;
      } else {
        // Signed URLs for caption grounding — used as untrusted evidence only.
        const imageUrls = [];
        for (const uri of attachments) {
          const signed = await db.integrations.Core.CreateFileSignedUrl({ file_uri: uri }).catch(() => null);
          if (signed?.signed_url) imageUrls.push(signed.signed_url);
        }
        copy = await draftCopy(db, kind, fields, imageUrls);
        if (!copy) return Response.json({ error: 'The Draft Could Not Be Generated — Please Try Again.' }, { status: 502 });
      }

      const draft = { kind, destination_id: body.destination_id, destination_label: DESTINATIONS[body.destination_id].label, fields, copy, attachments };
      const hash = await draftHash(draft);
      const goal = isEmail
        ? `Email: ${fields.subject}`.slice(0, 300)
        : kind === 'social_post' ? `Social post: ${fields.text || 'photo post'}` : `Marketplace listing: ${fields.item}`;
      const run = await db.entities.AutopilotRun.create({
        owner_user_id: user.id, kind: isEmail ? 'email' : kind, goal, document_ids: [], steps: [],
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
      const isEmail = EMAIL_KINDS.includes(draft.kind);
      const attachments = isEmail
        ? (draft?.attachments || [])
        : (Array.isArray(body.attachments)
          ? body.attachments.filter(a => typeof a === 'string' && a.startsWith('files/')).slice(0, MAX_ATTACHMENTS)
          : (draft?.attachments || []));
      const { fields, missing, errors } = validateFields(draft.kind, body.fields || draft.fields || {}, attachments);
      if (errors.length) return Response.json({ error: errors[0] }, { status: 400 });
      if (missing.length) return Response.json({ error: 'Missing Required Fields', missing }, { status: 400 });
      let copy;
      if (isEmail) {
        copy = fields.body;
      } else {
        const imageUrls = [];
        for (const uri of attachments) {
          const signed = await db.integrations.Core.CreateFileSignedUrl({ file_uri: uri }).catch(() => null);
          if (signed?.signed_url) imageUrls.push(signed.signed_url);
        }
        copy = (await draftCopy(db, draft.kind, fields, imageUrls)) || draft.copy;
      }
      const newDraft = { ...draft, fields, copy, attachments };
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
      const approvalError = checkApproval(app, hash, Date.now());
      if (approvalError) return Response.json({ error: approvalError }, { status: 409 });

      // Destination, plan and connection are re-checked at approval time —
      // auth may have changed since the draft.
      const isEmail = EMAIL_KINDS.includes(draft.kind);
      const gmailConnected = isEmail ? await probeGmail() : false;
      const guard = destinationUsable(draft.destination_id, draft.kind, isAdmin(user), { plan, gmailConnected });
      if (guard) return Response.json({ error: guard, needs_connection: true }, { status: 402 });
      if (isEmail && plan !== 'ultra') {
        return Response.json({ error: 'Gmail Actions Are An LBC AI Ultra Capability.', upgrade_required: true }, { status: 402 });
      }
      let gmailToken = null;
      if (isEmail) {
        try {
          const c = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
          gmailToken = c?.accessToken || null;
        } catch (_) {}
        if (!gmailToken) return Response.json({ error: 'Gmail Not Connected — Connect Your Account First.', needs_connection: true }, { status: 402 });
      }

      const claim = randomToken(16);
      await db.entities.AutopilotRun.update(run.id, {
        status: 'running', approval: { ...app, claim },
        lease_until: new Date(Date.now() + 120000).toISOString(),
        audit: [...(run.audit || []), auditEntry('approved', `Approval bound to the exact draft (${hash.slice(0, 10)})`)],
      });
      let receipt;
      try {
        receipt = await dispatchAction(draft, hash, { gmailToken });
      } catch (e) {
        if (e?.message === 'outcome_unknown') {
          // Ambiguous dispatch (network timeout / provider 5xx): the message
          // may still have been delivered. Consume the single-use approval so
          // no retry can duplicate the send; the owner reconciles in Gmail.
          await db.entities.AutopilotRun.update(run.id, {
            status: 'blocked', lease_until: null,
            blocked_reason: 'Outcome Unknown — Gmail Did Not Confirm In Time. Check Your Gmail Sent Or Drafts Folder Before Any Retry. Do Not Re-Approve: The Approval Was Consumed To Prevent A Duplicate.',
            approval: { ...app, claim, used_at: new Date().toISOString() },
            audit: [...(run.audit || []), auditEntry('dispatch_unknown', 'Gmail timed out mid-dispatch; approval consumed to prevent duplicates')],
          });
          return Response.json({ error: 'Outcome Unknown — Check Your Gmail Account.' }, { status: 504 });
        }
        if (e?.message === 'no_user_token') {
          await db.entities.AutopilotRun.update(run.id, {
            status: 'awaiting_approval', lease_until: null,
            audit: [...(run.audit || []), auditEntry('dispatch_failed', 'No Gmail token available at dispatch')],
          });
          return Response.json({ error: 'Gmail Not Connected — Connect Your Account First.', needs_connection: true }, { status: 402 });
        }
        // Definitive provider rejection: return to review; approval stays unused.
        await db.entities.AutopilotRun.update(run.id, {
          status: 'awaiting_approval', lease_until: null, blocked_reason: null,
          audit: [...(run.audit || []), auditEntry('dispatch_failed', String(e?.message || 'dispatch failed').slice(0, 200))],
        });
        return Response.json({ error: 'The Provider Rejected This Action — Review The Draft And Try Again.' }, { status: 402 });
      }
      await db.entities.AutopilotRun.update(run.id, {
        status: 'completed', receipt: { ...receipt, verified: true },
        approval: { ...app, claim, used_at: new Date().toISOString() }, lease_until: null,
        final_summary: receipt.mock
          ? 'Sent Through The Test Sandbox (Mock) — Nothing Was Published.'
          : draft.kind === 'email_draft'
            ? 'Draft Saved To Your Gmail Drafts Folder. Nothing Was Sent.'
            : `Sent From Your Gmail (Message ${receipt.external_id || ''})`.trim(),
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
      await db.entities.AutopilotRun.update(run.id, { status: 'cancelled', lease_until: null, lease_token: null, audit: [...(run.audit || []), auditEntry('cancelled', 'Cancelled by owner; completed steps are kept')] });
      return Response.json({ ok: true });
    }
    if (action === 'pause') {
      if (run.status !== 'running') return Response.json({ error: 'Not Running' }, { status: 409 });
      // The lease token is kept: an in-flight step keeps its fencing until it
      // finishes, then records its output without resuming the run.
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