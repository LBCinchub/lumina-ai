// Server-only Autopilot run creation core, called IN-PROCESS by both the
// `autopilot` handler and chat delegation with an already-verified session
// (`base44` = the request's user client, `db` = its service role, `user` =
// auth.me()). No nested HTTP invocation, so chat cannot lose the session.
// One planner, one preflight, one canonical-election path for every caller.
import { getUserPlan } from './tiers.ts';
import { planTask, preflight, auditEntry } from './autopilotEngine.ts';
import { GMAIL_CONNECTOR_ID } from './autopilotActions.ts';
import { validateContext, contextEvidence, ContextError } from './autopilotContext.ts';
import { pickCanonicalRun } from './chatDelegation.ts';

export const MAX_GOAL_CHARS = 3000;
const MAX_DOCS = 5;
const DAILY_LIMIT: Record<string, number> = { free: 5, superagent: 20, ultra: 40 };

export async function probeGmail(base44: any) {
  try {
    const c = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
    return !!c?.accessToken;
  } catch (_) {
    return false;
  }
}

export async function startExecution(db: any, run: any) {
  await db.entities.AutopilotRun.update(run.id, {
    status: 'running', lease_until: null, lease_token: null,
    audit: [...(run.audit || []), auditEntry('started', 'Execution started')],
  });
}

export async function planAndStore({ base44, db, user, plan }: any, run: any, clarification: any) {
  const docs = run.document_ids?.length
    ? await base44.entities.Document.filter({ id: { $in: run.document_ids }, status: 'ready' }).catch(() => [])
    : [];
  const { context } = await contextEvidence(db, base44, user, run.context || null);
  const gmailConnected = await probeGmail(base44);
  const p = await planTask(db, { goal: run.goal, docTitles: docs.map((d: any) => d.title), clarification, availability: { plan, gmailConnected, context } });
  if (p.needs_clarification && !clarification) {
    return db.entities.AutopilotRun.update(run.id, { status: 'awaiting_input', clarifying_question: p.clarifying_question, audit: [...(run.audit || []), auditEntry('clarify', 'Asked a clarifying question')] });
  }
  const blocked = preflight(p.steps, plan, docs.length > 0, { gmailConnected, context });
  return db.entities.AutopilotRun.update(run.id, {
    status: blocked ? 'blocked' : 'queued', blocked_reason: blocked || null,
    plan_summary: p.plan_summary, steps: p.steps, clarifying_question: null,
    audit: [...(run.audit || []), auditEntry(blocked ? 'blocked' : 'planned', blocked || `${p.steps.length} steps`)],
  });
}

// Returns { status, body } — the exact public contract of action 'create'.
export async function createAutopilotRun({ base44, db, user, plan }: any, input: any) {
  plan = plan || await getUserPlan(base44, user);
  const goal = typeof input.goal === 'string' ? input.goal.trim().slice(0, MAX_GOAL_CHARS) : '';
  if (goal.length < 5) return { status: 400, body: { error: 'Describe The Task In A Few Words' } };

  const startIso = new Date(new Date().toISOString().slice(0, 10)).toISOString();
  const today = await db.entities.AutopilotRun.filter({ owner_user_id: user.id, created_date: { $gte: startIso } }, 'created_date', 100).catch(() => []);
  if (today.length >= (DAILY_LIMIT[plan] || 5)) return { status: 429, body: { error: 'Daily Autopilot Limit Reached' } };
  if (today.some((r: any) => r.status === 'running')) return { status: 429, body: { error: 'One Autopilot Task Is Already Running' } };

  let agentId = null;
  if (typeof input.agent_id === 'string' && input.agent_id) {
    const a = (await base44.entities.UserAgent.filter({ id: input.agent_id }).catch(() => []))?.[0];
    if (!a || a.status === 'archived') return { status: 404, body: { error: 'Not found' } };
    agentId = a.id;
  }
  const requested = Array.isArray(input.document_ids) ? input.document_ids.filter((x: any) => typeof x === 'string').slice(0, MAX_DOCS) : [];
  const owned = requested.length ? await base44.entities.Document.filter({ id: { $in: requested } }).catch(() => []) : [];
  if (owned.length !== requested.length) return { status: 404, body: { error: 'Not found' } };

  // Explicit selected context — rejected BEFORE any model/tool call.
  let context;
  try { context = await validateContext(db, base44, user, input.context); } catch (e) {
    if (e instanceof ContextError) return { status: 404, body: { error: 'Not found' } };
    throw e;
  }

  // Created NON-startable, then a deterministic canonical election runs
  // BEFORE any planning or start. A losing duplicate never starts.
  const run = await db.entities.AutopilotRun.create({
    owner_user_id: user.id, agent_id: agentId, goal, document_ids: owned.map((d: any) => d.id), context,
    status: 'blocked', blocked_reason: 'Checking For A Duplicate Task', steps: [], audit: [auditEntry('created', 'Task received')],
  });
  if (context.conversation_id) {
    const twins = await db.entities.AutopilotRun.filter({ owner_user_id: user.id, goal }, 'created_date', 20).catch(() => []);
    const winner = pickCanonicalRun(twins, { ownerId: user.id, conversationId: context.conversation_id, goal, now: Date.now() });
    if (winner && winner.id !== run.id) {
      await db.entities.AutopilotRun.update(run.id, {
        status: 'cancelled', blocked_reason: null,
        audit: [...(run.audit || []), auditEntry('duplicate', 'Same request already in progress; this copy never started')],
      });
      return { status: 200, body: { run_id: winner.id, reused: true } };
    }
  }
  await planAndStore({ base44, db, user, plan }, run, null);
  const fresh = (await db.entities.AutopilotRun.filter({ id: run.id, owner_user_id: user.id }))[0];
  if (fresh.status === 'queued') await startExecution(db, fresh);
  return { status: 200, body: { run_id: run.id } };
}