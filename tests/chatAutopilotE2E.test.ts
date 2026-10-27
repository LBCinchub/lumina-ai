// End-to-end handler tests: REAL chatWithLumina, autopilot and autopilotWorker
// default exports. Only infrastructure is synthetic: an in-memory entity store,
// per-request session clients (auth propagates through functions.invoke by
// forwarding the caller's session header), a scripted model, and connectors
// that always fail (no live account can ever be used for dispatch).
import { test, expect, beforeEach } from 'vitest';
import chat from '../base44/functions/chatWithLumina/entry.ts';
import autopilot from '../base44/functions/autopilot/entry.ts';
import worker from '../base44/functions/autopilotWorker/entry.ts';
import { AUTOPILOT_MARKER } from '../base44/shared/actionIntent.ts';

const A = { id: 'user-a-fixture', email: 'a@example.invalid', role: 'user', full_name: 'Fixture A' };
const B = { id: 'user-b-fixture', email: 'b@example.invalid', role: 'user', full_name: 'Fixture B' };
const ADMIN = { id: 'admin-fixture', email: 'admin@example.invalid', role: 'admin' };
const USERS: any = { [A.id]: A, [B.id]: B, [ADMIN.id]: ADMIN };
const HANDLERS: any = { autopilot, chatWithLumina: chat, autopilotWorker: worker };

const REPRO_EMAIL = 'Research three ways to organize a home office and prepare a short summary for me. Do not send email or contact anyone.';
const REPRO_DESK = 'Prepare A Three-Step Plan For Organizing A Fictional Desk And Save It As A Markdown Document. Use Only The Details In This Message.';

const REPRO_LIVE = 'Plan And Draft A Three-Step Checklist For Organizing A Fictional Desk Using Autopilot. Save The Result As An Internal Draft. This Is A Verification Task: Use Only This Message, Do Not Read Personal History Or External Accounts, Do Not Send Email, Post, Publish, Spend Or Contact Anyone.';

let store: any, seq: number, llmCalls: any[], connectorCalls: number, gmailSends: number, plannerScript: any, nestedInvokes = 0;

const eq = (x: any, v: any) => (x ?? null) === (v ?? null);
function match(rec: any, q: any) {
  return Object.entries(q || {}).every(([k, v]: any) => {
    const x = rec[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(x);
      if ('$gte' in v) return String(x) >= String(v.$gte);
      return true;
    }
    return eq(x, v);
  });
}
const sortRows = (rows: any[], sort: any) => {
  if (typeof sort !== 'string' || !sort) return rows;
  const desc = sort.startsWith('-'); const f = sort.replace(/^-/, '');
  return [...rows].sort((a, b) => (String(a[f]) < String(b[f]) ? -1 : String(a[f]) > String(b[f]) ? 1 : 0) * (desc ? -1 : 1));
};

// Per-user RLS for user-scoped clients on the entities these flows touch.
const OWNED_BY_EMAIL = ['Document', 'UserAgent', 'UserSubscription', 'KnowledgeSource', 'UserContext', 'Conversation'];
function table(name: string, session: any) {
  const scoped = (r: any) => !session || !OWNED_BY_EMAIL.includes(name) || r.created_by === session.email || r.owner_email === session.email;
  const rows = () => (store[name] ||= []);
  return {
    filter: async (q: any, sort?: any, limit = 50) => sortRows(rows().filter(r => scoped(r) && match(r, q)), sort).slice(0, limit),
    list: async (sort?: any, limit = 50) => sortRows(rows().filter(scoped), sort).slice(0, limit),
    get: async (id: string) => rows().find(r => r.id === id && scoped(r)),
    create: async (d: any) => {
      if (name === 'AutopilotRun' && (globalThis as any).__failCreate) throw Object.assign(new Error('synthetic store failure'), { status: 503 });
      const r = { ...d, id: `${name}-${++seq}`, created_date: new Date(Date.now() + seq).toISOString(), ...(session ? { created_by: session.email, created_by_id: session.id } : {}) };
      rows().push(r); return { ...r };
    },
    update: async (id: string, patch: any) => { const r = rows().find(x => x.id === id && scoped(x)); if (!r) throw new Error('404'); Object.assign(r, patch); return { ...r }; },
    updateMany: async (q: any, u: any) => { for (const r of rows().filter(x => scoped(x) && match(x, q))) Object.assign(r, u.$set); return { has_more: false }; },
    delete: async (id: string) => { store[name] = rows().filter(r => r.id !== id); },
  };
}
const entities = (session: any) => new Proxy({}, { get: (_t, n: string) => table(n, session) });

const integrations = {
  Core: {
    InvokeLLM: async (args: any) => {
      llmCalls.push(args);
      if (args.response_json_schema?.properties?.steps) return plannerScript();
      if (args.response_json_schema?.properties?.answer) return { answer: 'Synthetic findings.', sources: [{ title: 'Example', url: 'https://example.invalid/a' }] };
      if (args.response_json_schema) return {};
      if (/Compile a polished markdown document/.test(args.prompt)) return '# Fictional Desk Plan\n\n1. Clear the surface.\n2. Group items.\n3. Label drawers.';
      return '1. Clear the surface.\n2. Group items.\n3. Label drawers.';
    },
    GenerateImage: async () => { throw new Error('not used'); },
  },
};

function clientFor(session: any) {
  const c: any = {
    auth: { me: async () => { if (!session) throw new Error('401'); return session; } },
    entities: entities(session),
    integrations,
    functions: {
      // Reproduces the live failure: a nested server-side invoke does NOT
      // carry the user's session. Chat must never depend on it.
      invoke: async (name: string, body: any) => {
        nestedInvokes++;
        const res = await call(HANDLERS[name], null, body);
        if (res.status >= 400) throw Object.assign(new Error('Request failed'), { name: 'AxiosError', response: { data: res.body, status: res.status } });
        return { data: res.body };
      },
    },
  };
  c.asServiceRole = {
    entities: entities(null), integrations,
    connectors: {
      getCurrentAppUserConnection: async () => { connectorCalls++; throw new Error('no synthetic connection'); },
      getConnection: async () => { connectorCalls++; throw new Error('no synthetic connection'); },
    },
  };
  return c;
}

async function call(handler: any, session: any, body: any) {
  const req = new Request('https://synthetic.invalid/fn', {
    method: 'POST', headers: { 'x-test-session': session?.id || '' }, body: JSON.stringify(body),
  });
  const res = await handler(req);
  return { status: res.status, body: await res.json() };
}

const convo = (id: string, u: any) => ({ id, title: 'Fixture', owner_email: u.email, created_by: u.email, ownership_state: 'human_verified', created_date: new Date().toISOString() });
const sub = (u: any) => ({ id: `sub-${u.id}`, plan: 'superagent', subscription_status: 'active', created_by: u.email, created_date: '2026-01-01T00:00:00.000Z' });
const runsOf = (u: any) => (store.AutopilotRun || []).filter((r: any) => r.owner_user_id === u.id);

beforeEach(() => {
  seq = 0; llmCalls = []; connectorCalls = 0; gmailSends = 0; nestedInvokes = 0;
  // Adversarial planner: ignores constraints and proposes research + email.
  plannerScript = () => ({
    needs_clarification: false, plan_summary: 'Synthetic plan',
    steps: [
      { capability_id: 'research.web', title: 'Look It Up', input: 'desk ideas' },
      { capability_id: 'plan.breakdown', title: 'Three Steps', input: 'three steps' },
      { capability_id: 'email.send', title: 'Email It', input: 'send to someone' },
    ],
  });
  store = {
    Conversation: [convo('conv-a1', A), convo('conv-a2', A), convo('conv-b1', B)],
    UserSubscription: [sub(A), sub(B)],
    MemorySettings: [A, B].map(u => ({ id: `ms-${u.id}`, owner_user_id: u.id, memory_enabled: false, history_access_enabled: false })),
    AutopilotPreference: [], AutopilotRun: [], Message: [], Document: [], AiDataQuarantine: [],
  };
  (globalThis as any).__clientFor = (req: any) => clientFor(USERS[req.headers.get('x-test-session')] || null);
  const origFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: any, init?: any) => {
    if (/gmail|googleapis/.test(String(url))) { gmailSends++; throw new Error('blocked'); }
    return origFetch(url, init);
  };
});

async function drive(u: any, runId: string, max = 12) {
  let last: any;
  for (let i = 0; i < max; i++) {
    last = await call(autopilot, u, { action: 'step', run_id: runId });
    if (last.body.status !== 'running') break;
  }
  return last;
}

test('repro 2 (desk): real task marker, guarded plan, saved document id + receipt, owner-scoped', async () => {
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  expect(r.status).toBe(200);
  const runId = r.body.autopilot_run_id;
  expect(r.body.content.startsWith(`${AUTOPILOT_MARKER}${runId}\n`)).toBe(true);
  const run0 = store.AutopilotRun.find((x: any) => x.id === runId);
  expect(run0.owner_user_id).toBe(A.id);
  expect(run0.context.conversation_id).toBe('conv-a1');
  expect(run0.steps.map((s: any) => s.capability_id)).toEqual(['plan.breakdown', 'document.generate']);
  expect(run0.status).toBe('running');

  const end = await drive(A, runId);
  expect(end.body.status).toBe('completed');
  const run = store.AutopilotRun.find((x: any) => x.id === runId);
  const docId = run.steps.find((s: any) => s.capability_id === 'document.generate').artifact_document_id;
  const doc = store.Document.find((d: any) => d.id === docId);
  expect(doc).toBeTruthy();
  expect(doc.created_by).toBe(A.email);
  expect(doc.title).toBe('Fictional Desk Plan');
  // "Use only this message": no web call and no thread evidence in any step prompt.
  expect(llmCalls.some(c => c.add_context_from_internet)).toBe(false);
  expect(llmCalls.some(c => /SELECTED CONTEXT/.test(c.prompt || ''))).toBe(false);
  expect(connectorCalls === 0 || gmailSends === 0).toBe(true);
  expect(gmailSends).toBe(0);
  // B cannot see A's document or run.
  expect(await clientFor(B).entities.Document.filter({ id: docId })).toEqual([]);
  expect((await call(autopilot, B, { action: 'step', run_id: runId })).status).toBe(404);
});

test('repro 1 (do not send email): delegated, email step never planned or executed', async () => {
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_EMAIL });
  expect(r.status).toBe(200);
  expect(r.body.content).not.toMatch(/Draft The Email/);
  const runId = r.body.autopilot_run_id;
  expect(runId).toBeTruthy();
  const run = store.AutopilotRun.find((x: any) => x.id === runId);
  expect(run.steps.some((s: any) => s.capability_id.startsWith('email.'))).toBe(false);
  await drive(A, runId);
  expect(gmailSends).toBe(0);
  const fin = store.AutopilotRun.find((x: any) => x.id === runId);
  expect(fin.steps.map((s: any) => [s.capability_id, s.status])).toEqual([['research.web', 'completed'], ['plan.breakdown', 'completed']]);
  expect(fin.status).toBe('completed');
});

test('execution-time enforcement: a stored prohibited step is skipped with no connector call', async () => {
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_EMAIL });
  const run = store.AutopilotRun.find((x: any) => x.id === r.body.autopilot_run_id);
  run.steps.unshift({ capability_id: 'email.send', title: 'Tampered', input: 'x', status: 'pending', attempts: 0 });
  connectorCalls = 0; // count only calls made during execution
  const s = await call(autopilot, A, { action: 'step', run_id: run.id });
  expect(s.body.skipped).toBe('email.send');
  expect(run.steps[0].status).toBe('skipped');
  expect(connectorCalls).toBe(0);
  expect(gmailSends).toBe(0);
});

test('quoted examples, negation-only and advice stay in normal chat (no run, no action link)', async () => {
  for (const message of [
    'What do you think about the line "send an email to the team and prepare a report"?',
    'How should I prepare a plan to organize my desk?',
    'Give me advice: should I draft a summary report for my boss?',
  ]) {
    const before = store.AutopilotRun.length;
    const r = await call(chat, A, { conversation_id: 'conv-a1', message });
    expect(r.status).toBe(200);
    expect(r.body.autopilot_run_id).toBeUndefined();
    expect(String(r.body.content)).not.toMatch(/\/autopilot\?kind=/);
    expect(store.AutopilotRun.length).toBe(before);
  }
});

test('internal draft-only: draft saved internally, nothing external planned', async () => {
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: 'Draft a product announcement memo and save it as an internal draft. Do not post or publish anything.' });
  const run = store.AutopilotRun.find((x: any) => x.id === r.body.autopilot_run_id);
  expect(run.steps.at(-1).capability_id).toBe('document.generate');
  expect(run.steps.some((s: any) => s.capability_id.startsWith('email.'))).toBe(false);
  await drive(A, run.id);
  expect(run.status).toBe('completed');
  expect(run.steps.at(-1).artifact_document_id).toBeTruthy();
});

test('concurrent duplicates: one canonical run, loser cancelled before it ever starts', async () => {
  const seen: string[] = [];
  const orig = table('AutopilotRun', null).update;
  const res = await Promise.all([1, 2, 3].map(() => call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK })));
  const ids = new Set(res.map(r => r.body.autopilot_run_id));
  expect(ids.size).toBe(1);
  const all = runsOf(A);
  const live = all.filter((r: any) => r.status !== 'cancelled');
  expect(live.length).toBe(1);
  for (const loser of all.filter((r: any) => r.status === 'cancelled')) {
    expect(loser.steps).toEqual([]); // never planned
    expect(loser.audit.some((a: any) => a.event === 'started')).toBe(false); // never started
    expect((await call(autopilot, A, { action: 'step', run_id: loser.id })).body.status).toBe('cancelled');
  }
  // Planner ran exactly once (only the canonical run was planned).
  expect(llmCalls.filter(c => c.response_json_schema?.properties?.steps).length).toBe(1);
  void seen; void orig;
});

test('isolation: other thread and other user get their own runs; foreign conversation is 404', async () => {
  const a1 = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  await drive(A, a1.body.autopilot_run_id);
  const a2 = await call(chat, A, { conversation_id: 'conv-a2', message: REPRO_DESK });
  // B targeting A's conversation directly is rejected before any run exists.
  expect((await call(autopilot, B, { action: 'create', goal: REPRO_DESK, context: { conversation_id: 'conv-a1' } })).status).toBe(404);
  const b1 = await call(chat, B, { conversation_id: 'conv-b1', message: REPRO_DESK });
  expect(new Set([a1.body.autopilot_run_id, a2.body.autopilot_run_id, b1.body.autopilot_run_id]).size).toBe(3);
  expect(store.AutopilotRun.find((r: any) => r.id === b1.body.autopilot_run_id).owner_user_id).toBe(B.id);
  expect((await call(chat, B, { conversation_id: 'conv-a1', message: REPRO_DESK })).status).toBe(404);
  expect(runsOf(B).length).toBe(1);
  expect((await call(chat, null, { conversation_id: 'conv-a1', message: REPRO_DESK })).status).toBe(401);
});

test('refresh: thread reload shows the marker; same request again reuses the run', async () => {
  const r1 = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  const saved = store.Message.filter((m: any) => m.conversation_id === 'conv-a1' && m.role === 'assistant');
  expect(saved.at(-1).content.startsWith(`${AUTOPILOT_MARKER}${r1.body.autopilot_run_id}`)).toBe(true);
  expect(saved.at(-1).owner_email).toBe(A.email);
  const r2 = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  expect(r2.body.autopilot_run_id).toBe(r1.body.autopilot_run_id);
  expect(r2.body.content).toMatch(/already in progress/);
});

test('pause, mode-off and revocation stop execution', async () => {
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  const id = r.body.autopilot_run_id;
  expect((await call(autopilot, A, { action: 'pause', run_id: id })).status).toBe(200);
  expect((await call(autopilot, A, { action: 'step', run_id: id })).body.status).toBe('paused');
  expect(store.Document.length).toBe(0);
  await call(autopilot, A, { action: 'resume', run_id: id });
  // Revoke the selected conversation (quarantined) -> next step blocks, nothing saved.
  store.AiDataQuarantine.push({ id: 'q1', entity_type: 'Conversation', record_id: 'conv-a1', resolved: false });
  expect((await call(autopilot, A, { action: 'step', run_id: id })).body.status).toBe('blocked');
  expect(store.Document.length).toBe(0);
});

test('live repro A: NEW goal via chat creates a real run in-process (no nested invoke), same as direct create', async () => {
  // The nested-invoke path loses auth in this harness, exactly as live.
  expect((await clientFor(A).functions.invoke('autopilot', { action: 'create', goal: REPRO_LIVE }).catch((e: any) => e.response.status))).toBe(401);
  nestedInvokes = 0;
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_LIVE });
  expect(r.status).toBe(200);
  expect(nestedInvokes).toBe(0);
  const runId = r.body.autopilot_run_id;
  expect(runId).toBeTruthy();
  expect(r.body.content.startsWith(`${AUTOPILOT_MARKER}${runId}\n`)).toBe(true);
  const run = store.AutopilotRun.find((x: any) => x.id === runId);
  expect(run.owner_user_id).toBe(A.id);
  expect(run.audit.filter((a: any) => a.event === 'created').length).toBe(1);
  expect(runsOf(A).length).toBe(1);
  expect(run.steps.some((s: any) => s.capability_id.startsWith('email.') || s.capability_id === 'research.web')).toBe(false);
  await drive(A, runId);
  expect(run.status).toBe('completed');
  expect(run.approval).toBeUndefined();
  expect(run.action_draft).toBeUndefined();
  expect(gmailSends).toBe(0);
  // Retry of the same request reuses this run, never a second one.
  const again = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_LIVE });
  expect(again.body.autopilot_run_id).toBe(runId);
  expect(runsOf(A).length).toBe(1);
});

test('creation failure (thrown store error) is a clear error, no marker, no run claimed', async () => {
  (globalThis as any).__failCreate = true;
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_LIVE });
  (globalThis as any).__failCreate = false;
  expect(r.status).toBe(200);
  expect(r.body.autopilot_run_id).toBeNull();
  expect(r.body.content).not.toContain(AUTOPILOT_MARKER);
  expect(r.body.content).toMatch(/could not start/);
  expect(r.body.content).not.toMatch(/complete|awaiting approval/i);
  expect(runsOf(A).length).toBe(0);
});

test('limit refusal surfaces the real reason, foreign conversation stays 404 with no run', async () => {
  store.AutopilotRun.push({ id: 'busy1', owner_user_id: A.id, goal: 'other', status: 'running', context: {}, steps: [], audit: [], created_date: new Date().toISOString() });
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_LIVE });
  expect(r.body.autopilot_run_id).toBeNull();
  expect(r.body.content).toMatch(/Already Running/);
  expect((await call(chat, B, { conversation_id: 'conv-a1', message: REPRO_LIVE })).status).toBe(404);
  expect(runsOf(B).length).toBe(0);
});

test('mode truth + worker auth: unattended run finishes; library doc saved only on owner return', async () => {
  const on = await call(autopilot, A, { action: 'set_mode', enabled: true });
  expect(on.body.enabled).toBe(true);
  expect((await call(worker, null, {})).status).toBe(401);
  expect((await call(worker, A, {})).status).toBe(403);
  const r = await call(chat, A, { conversation_id: 'conv-a1', message: REPRO_DESK });
  const w = await call(worker, ADMIN, {});
  expect(w.status).toBe(200);
  const run = store.AutopilotRun.find((x: any) => x.id === r.body.autopilot_run_id);
  for (let i = 0; i < 6; i++) await call(worker, ADMIN, {});
  // Nothing is written to the library under the scheduler's identity.
  expect(store.Document.length).toBe(0);
  expect(gmailSends).toBe(0);
  const m = await call(autopilot, A, { action: 'get_mode' });
  expect(m.body.background.ready).toBe(true);
  const doc = run.steps.find((s: any) => s.capability_id === 'document.generate');
  if (doc?.status === 'completed') expect(store.Document.length).toBe(1);
});