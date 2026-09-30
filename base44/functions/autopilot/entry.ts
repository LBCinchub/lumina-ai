import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getUserPlan } from '../../shared/tiers.ts';
import { publicRegistry } from '../../shared/autopilotRegistry.ts';
import { planTask, preflight, runOneStep, auditEntry, MAX_STEPS } from '../../shared/autopilotEngine.ts';

// LBC AI Autopilot — one authenticated server-side task orchestrator.
// Identity is ALWAYS auth.me(); no client-supplied user/owner ids are read.
// Run records are server-write-only (RLS); the service role is used only after
// an explicit owner_user_id match on every access.
const MAX_GOAL_CHARS = 3000;
const MAX_DOCS = 5;
const DAILY_LIMIT = { free: 5, superagent: 20, ultra: 40 };

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
      return Response.json({ plan, capabilities: publicRegistry() });
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
      // Steps advance one per 'step' call while the task is open; closing the
      // browser leaves the run resumable (no background continuation offered).
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

      // Ownership: agent + documents verified through the USER-scoped client (RLS).
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