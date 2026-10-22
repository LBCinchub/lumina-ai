import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeRepo as serverNorm } from '../base44/shared/githubRepo.ts';
import { normalizeRepo as clientNorm } from '../src/lib/githubRepo.js';
import backup from '../base44/functions/pushTemplatesBackup/entry.ts';

const CORPUS = ['LBCinchub/automation', 'https://github.com/LBCinchub/automation', 'https://github.com/LBCinchub/automation/', 'https://github.com/LBCinchub/automation.git',
  'LBCinchub', 'https://github.com/LBCinchub', 'https://github.com/orgs/LBCinchub', '', '  ', 'http://github.com/a/b', 'https://evil.com/a/b',
  'https://github.com.evil.com/a/b', 'https://u:p@github.com/a/b', 'a/b/c', 'a/..', 'a%2Fb/c', 'git@github.com:a/b.git', 'a/b?x=1'];

test('server and browser normalizers agree on the whole corpus', () => {
  for (const c of CORPUS) expect(clientNorm(c)).toEqual(serverNorm(c));
});
test('normalizer accepts owner/repo and HTTPS URLs, rejects org pages clearly', () => {
  for (const c of CORPUS.slice(0, 4)) expect(serverNorm(c)).toEqual({ ok: true, repo: 'LBCinchub/automation' });
  for (const c of ['LBCinchub', 'https://github.com/LBCinchub', 'https://github.com/orgs/LBCinchub']) expect(serverNorm(c).code).toBe('organization');
  for (const c of CORPUS.slice(9)) expect(serverNorm(c).ok).toBe(false);
});

const OWNER = { id: 'u1', email: 'owner@example.invalid', role: 'admin' };
let store: any, commits: number, session: any, connected: boolean;
const tbl = (n: string, scoped: boolean) => ({
  list: async () => (store[n] ||= []).filter((r: any) => !scoped || r.created_by === session?.email),
  filter: async (q: any) => (store[n] ||= []).filter((r: any) => Object.entries(q).every(([k, v]) => r[k] === v)),
  create: async (d: any) => { const r = { id: `${n}-${(store[n] ||= []).length + 1}`, ...d }; store[n].push(r); return r; },
  update: async (id: string, p: any) => Object.assign(store[n].find((r: any) => r.id === id), p),
});
beforeEach(() => {
  commits = 0; session = OWNER; connected = true;
  store = { TerminalCommandTemplate: [{ id: 't1', name: 'ls', command: 'ls', created_by: OWNER.email, created_date: '2026-01-01', updated_date: '2026-01-01' }, { id: 't2', name: 'x', command: 'x', created_by: 'other@example.invalid' }] };
  const ents = (scoped: boolean) => new Proxy({}, { get: (_t, n: string) => tbl(n, scoped) });
  (globalThis as any).__clientFor = undefined;
  (globalThis as any).__client = {
    auth: { me: async () => { if (!session) throw new Error('401'); return session; } },
    entities: ents(true),
    asServiceRole: { entities: ents(false), connectors: { getCurrentAppUserConnection: async () => (connected ? { accessToken: 'synthetic' } : null) } },
  };
  vi.stubGlobal('fetch', vi.fn(async (_u: string, o: any) => {
    if (o?.method === 'PUT') { commits++; return { ok: true, status: 201, json: async () => ({ commit: { sha: 'abc1234567890' }, content: { html_url: 'https://github.com/x' } }) }; }
    return { ok: false, status: 404, json: async () => ({}) };
  }));
});
afterEach(() => vi.unstubAllGlobals());
const call = async (b: any) => { const r = await backup(new Request('https://t.invalid', { method: 'POST', body: JSON.stringify(b) })); return { status: r.status, body: await r.json() }; };
const REPO = 'https://github.com/LBCinchub/automation';

test('preview then confirm commits the exact snapshot once; replay is rejected', async () => {
  const p = await call({ repo: REPO });
  expect(p.status).toBe(200);
  expect(p.body.preview.template_count).toBe(1); // only the owner's templates
  await new Promise(r => setTimeout(r, 5)); // a new clock tick must not change the hash
  const c = await call({ repo: 'LBCinchub/automation', confirmation_token: p.body.confirmation_token });
  expect(c.body.success).toBe(true);
  expect(commits).toBe(1);
  const again = await call({ repo: REPO, confirmation_token: p.body.confirmation_token });
  expect(again.status).toBe(403);
  expect(commits).toBe(1);
});
test('changed templates, changed target and expired tokens never commit', async () => {
  const p = await call({ repo: REPO });
  store.TerminalCommandTemplate[0].command = 'rm';
  expect((await call({ repo: REPO, confirmation_token: p.body.confirmation_token })).status).toBe(409);
  const p2 = await call({ repo: REPO });
  expect((await call({ repo: REPO, branch: 'dev', confirmation_token: p2.body.confirmation_token })).status).toBe(403);
  const p3 = await call({ repo: REPO });
  store.AiActionConfirmation.at(-1).expires_at = '2000-01-01T00:00:00.000Z';
  expect((await call({ repo: REPO, confirmation_token: p3.body.confirmation_token })).status).toBe(403);
  expect(commits).toBe(0);
});
test('org input, non-allowlisted repo, zero templates, no connection, non-admin, signed-out', async () => {
  expect((await call({ repo: 'LBCinchub' })).body.code).toBe('organization');
  expect((await call({ repo: 'someone/else' })).status).toBe(403);
  connected = false; expect((await call({ repo: REPO })).body.code).toBe('no_connection'); connected = true;
  store.TerminalCommandTemplate = []; expect((await call({ repo: REPO })).body.code).toBe('empty');
  session = { id: 'u2', email: 'u2@example.invalid', role: 'user' }; expect((await call({ repo: REPO })).status).toBe(403);
  session = null; expect((await call({ repo: REPO })).status).toBe(401);
  expect(commits).toBe(0);
});