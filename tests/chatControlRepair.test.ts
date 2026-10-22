// Regression fixtures for the chat-control verification repair. Clients
// return BROAD (admin-like, unfiltered) results so ownership is proven by the
// handler's own predicates, not by a pre-filtered mock. No real provider calls.
import { test, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectControlIntent, handleControl, isAttributed } from '../base44/shared/chatControl.ts';
import { probeConnection } from '../base44/shared/connectionProbe.ts';

vi.mock('base44:runtime', () => ({ secrets: { get: () => '' }, waitUntil: () => {} }));

const FOUNDER = { id: 'f1', email: 'mokhtartareksamara@gmail.com', role: 'admin' };
const ADMIN = { id: 'a1', email: 'admin@example.invalid', role: 'admin' };
const OTHER = 'other@example.invalid';

const BROAD: any = {
  BuildProject: [{ title: 'OwnProject', created_by: ADMIN.email }, { title: 'ForeignProject', created_by: OTHER }],
  Document: [{ title: 'OwnDoc', created_by: ADMIN.email }, { title: 'ForeignDoc', created_by: OTHER }],
  TerminalCommandTemplate: [{ name: 'OwnTpl', created_by_id: ADMIN.id }, { name: 'ForeignTpl', created_by_id: 'x' }, { name: 'ForeignTpl2', created_by_id: 'y' }],
  UserAgent: [
    { id: 'ag-own', name: 'OwnAgent', owner_email: ADMIN.email, ownership_state: 'human_verified' },
    { id: 'ag-legacy', name: 'LegacyAgent', owner_email: ADMIN.email, ownership_state: 'anonymous_legacy' },
    { id: 'ag-other', name: 'ForeignAgent', owner_email: OTHER, ownership_state: 'human_verified' },
  ],
  UserAgentTask: [
    { name: 'OwnTask', agent_id: 'ag-own', owner_email: ADMIN.email, ownership_state: 'human_verified', schedule_type: 'daily' },
    { name: 'OrphanParentTask', agent_id: 'ag-other', owner_email: ADMIN.email, ownership_state: 'human_verified', schedule_type: 'daily' },
    { name: 'ForeignTask', agent_id: 'ag-other', owner_email: OTHER, ownership_state: 'human_verified', schedule_type: 'daily' },
  ],
};
const HIST = [
  { commit: '4fb5dd19e35a2d2086e82c36ba4f0f9d621e1756', committed_at: '2026-05-01T00:00:00Z', summary: 'Repository Files Updated (Detailed Feature Attribution Not Yet Reviewed)', attributed: true },
  { commit: '6f36ac1a06', committed_at: '2026-10-22T06:44:54Z', summary: 'Fix GitHub routing', attributed: true },
];

function client({ fail = false, token = 'synthetic' as string | null, history = HIST as any } = {}) {
  const ent = new Proxy({}, { get: (_t, n: string) => ({
    filter: async () => { if (fail) throw new Error('NETWORK_ERROR'); return BROAD[n] || []; },
    list: async () => { if (fail) throw new Error('NETWORK_ERROR'); return BROAD[n] || []; },
  }) });
  const svc = new Proxy({}, { get: (_t, n: string) => ({
    list: async () => { if (history === 'throw') throw new Error('NETWORK_ERROR'); return n === 'ProjectHistoryEntry' ? history : []; },
    filter: async () => { if (fail) throw new Error('NETWORK_ERROR'); return []; },
  }) });
  return { entities: ent, asServiceRole: { entities: svc, connectors: { getCurrentAppUserConnection: async () => (token ? { accessToken: token } : null) } } };
}
const run = (b: any, user: any, msg: string) => handleControl({ base44: b, db: b.asServiceRole, user, conversationId: 'c1', intent: detectControlIntent(msg) });
const mockFetch = (impl: any) => vi.stubGlobal('fetch', vi.fn(impl));
afterEach(() => vi.unstubAllGlobals());

test('GAP1: admin broad results never leak foreign records into "Your" lists', async () => {
  const b = client();
  const p = await run(b, ADMIN, 'show my projects');
  expect(p).toContain('OwnProject'); expect(p).not.toContain('ForeignProject');
  const d = await run(b, ADMIN, 'show my documents');
  expect(d).toContain('OwnDoc'); expect(d).not.toContain('ForeignDoc');
  const t = await run(b, ADMIN, 'show my templates');
  expect(t).toContain('OwnTpl'); expect(t).not.toContain('ForeignTpl');
  const a = await run(b, ADMIN, 'show my agents');
  expect(a).toContain('OwnAgent'); expect(a).not.toMatch(/ForeignAgent|LegacyAgent/);
});

test('GAP1: agent tasks require an owned, verified parent agent', async () => {
  const out = await run(client(), ADMIN, 'show my tasks');
  expect(out).toContain('OwnTask');
  expect(out).not.toMatch(/OrphanParentTask|ForeignTask/);
});

test('GAP1: backup prep counts only caller-owned templates', async () => {
  mockFetch(async () => new Response('{}', { status: 401 }));
  const out = await run(client(), ADMIN, 'prepare a template backup');
  expect(out).toMatch(/You Have 1 Saved Template\./);
});

test('GAP2: read errors are honest, never empty success', async () => {
  const b = client({ fail: true });
  for (const m of ['show my projects', 'show my agents', 'show my tasks', 'continue this task']) {
    const out = await run(b, ADMIN, m);
    expect(out).toMatch(/Could Not Read/); expect(out).not.toMatch(/No .* Yet|No Unfinished/);
  }
  mockFetch(async () => new Response('{}', { status: 200 }));
  expect(await run(b, ADMIN, 'prepare a template backup')).toMatch(/Could Not Read Your Templates/);
  expect(await run(client({ history: 'throw' }), FOUNDER, 'project history')).toMatch(/Read Error, Not An Empty History/);
  expect(await run(client({ history: [] }), FOUNDER, 'project history')).toMatch(/No Project History Is Stored Yet/);
});

test('GAP3: probe states — verified, 401, 403, timeout, missing grant', async () => {
  mockFetch(async () => new Response(JSON.stringify({ login: 'me' }), { status: 200 }));
  expect(await probeConnection(client(), 'github')).toEqual({ state: 'connected', verified: true, login: 'me' });
  mockFetch(async () => new Response('{}', { status: 401 }));
  expect((await probeConnection(client(), 'github')).state).toBe('needs_reconnect');
  mockFetch(async () => new Response('{}', { status: 403 }));
  expect((await probeConnection(client(), 'gmail')).state).toBe('needs_reconnect');
  mockFetch(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); });
  expect(await probeConnection(client(), 'github')).toEqual({ state: 'unknown', reason: 'timeout' });
  const f = vi.fn(); vi.stubGlobal('fetch', f);
  expect((await probeConnection(client({ token: null }), 'github')).state).toBe('missing');
  expect(f).not.toHaveBeenCalled();
});

test('GAP3: revoked token is never reported as connected; route-only features say open screen', async () => {
  mockFetch(async () => new Response('{}', { status: 401 }));
  const c = await run(client(), ADMIN, 'what is connected?');
  expect(c).toMatch(/\*\*Gmail\*\* — Needs Reconnect/); expect(c).toMatch(/\*\*GitHub\*\* — Needs Reconnect/);
  expect(c).not.toMatch(/Connected And Verified/);
  mockFetch(async () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); });
  expect(await run(client(), ADMIN, 'my connections')).toMatch(/\*\*GitHub\*\* — Unknown/);
  const caps = await run(client(), ADMIN, 'what can you do?');
  expect(caps).toMatch(/Personal Memory Controls\*\* — Available On Its Own Screen/);
  expect(caps).toMatch(/Template Backup To GitHub\*\* — Not Available: Your GitHub Connection Could Not Be Verified/);
});

test('GAP4: generic summaries are unattributed at render time; stored data untouched', async () => {
  expect(isAttributed(HIST[0])).toBe(false);
  expect(isAttributed(HIST[1])).toBe(true);
  const snapshot = JSON.stringify(HIST);
  const out = await run(client(), FOUNDER, 'project history');
  expect(out).toMatch(/2 Commits/);
  expect(out).not.toContain('4fb5dd1');
  expect(out).toMatch(/1 Matching Generic File Or Configuration Changes Are Unattributed/);
  expect(JSON.stringify(HIST)).toBe(snapshot);
});

test('GAP4: non-founder admin denied at handler; entity RLS is server-only for every op', async () => {
  const out = await run(client(), ADMIN, 'what did we build?');
  expect(out).toMatch(/Only To The Verified Project Owner/);
  expect(out).not.toMatch(/6f36ac1|Fix GitHub/);
  const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../base44/entities/ProjectHistoryEntry.jsonc'), 'utf8'));
  for (const op of ['read', 'create', 'update', 'delete']) expect(schema.rls[op]).toEqual({ user_condition: { role: '__server_only__' } });
});