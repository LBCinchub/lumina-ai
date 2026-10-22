// Persistent Mode regression tests. Synthetic in-memory fixtures only.
// Runner: npx vitest run tests/autopilotMode.test.ts
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMode, setMode, ModeError, BACKGROUND_BLOCKER } from '../base44/shared/autopilotMode.ts';
import { createModeController } from '../src/lib/autopilotModeController.js';

function fakeDb({ rows = [] as any[], failRead = false, failWrite = false, shape = 'array', dropWrite = false } = {}) {
  const store = rows.map(r => ({ ...r }));
  let n = store.length;
  const E = {
    async filter(q: any) {
      if (failRead) throw new Error('403');
      const out = store.filter(r => r.owner_user_id === q.owner_user_id).map(r => ({ ...r }));
      return shape === 'page' ? { items: out, has_more: false } : out;
    },
    async create(d: any) { if (failWrite) throw new Error('500'); if (!dropWrite) store.push({ id: 'p' + ++n, ...d }); return d; },
    async update(id: string, d: any) { if (failWrite) throw new Error('500'); if (!dropWrite) Object.assign(store.find(r => r.id === id), d); return d; },
    async updateMany() { throw new Error('must not be used'); },
  };
  return { store, entities: { AutopilotPreference: E } };
}
const rejects = async (p: Promise<any>, code: string) => {
  await assert.rejects(p, (e: any) => e instanceof ModeError && e.code === code);
};

test('first enable with no preference creates one, then reads back on', async () => {
  const db = fakeDb();
  assert.deepEqual((await getMode(db, 'u1')).saved, false);
  const r = await setMode(db, 'u1', true);
  assert.equal(r.enabled, true); assert.equal(db.store.length, 1);
  assert.equal((await getMode(db, 'u1')).enabled, true); // reload / re-login reads server storage
});

test('existing preference disable/enable updates by id, no new rows', async () => {
  const db = fakeDb({ rows: [{ id: 'a', owner_user_id: 'u1', enabled: true }] });
  assert.equal((await setMode(db, 'u1', false)).enabled, false);
  assert.equal((await setMode(db, 'u1', true)).enabled, true);
  assert.equal(db.store.length, 1);
});

test('no record = default off; read failure = error, not off', async () => {
  assert.deepEqual(await getMode(fakeDb(), 'u1'), { enabled: false, saved: false, changed_at: null });
  await rejects(getMode(fakeDb({ failRead: true }), 'u1'), 'storage_read_failed');
});

test('write failure and unconfirmed write are reported, never false success', async () => {
  await rejects(setMode(fakeDb({ failWrite: true }), 'u1', true), 'storage_write_failed');
  await rejects(setMode(fakeDb({ dropWrite: true }), 'u1', true), 'not_persisted');
});

test('supported response shapes: array and page {items}', async () => {
  const db = fakeDb({ rows: [{ id: 'a', owner_user_id: 'u1', enabled: true }], shape: 'page' });
  assert.equal((await getMode(db, 'u1')).enabled, true);
});

test('non-boolean input rejected', async () => {
  for (const v of ['true', 1, null, undefined, {}]) await rejects(setMode(fakeDb(), 'u1', v), 'invalid_input');
});

test('duplicate rows (incl. concurrent first saves) fail clearly, nothing deleted', async () => {
  const db = fakeDb();
  const res = await Promise.allSettled([setMode(db, 'u1', true), setMode(db, 'u1', true)]);
  assert.equal(db.store.length, 2); // no uniqueness guarantee in SDK: detected, not hidden
  assert.ok(res.every(r => r.status === 'rejected' && (r.reason as any).code === 'duplicate_preferences'));
  await rejects(getMode(db, 'u1'), 'duplicate_preferences');
  assert.equal(db.store.length, 2);
});

test('unauthenticated rejected; two-user isolation; owner spoof ignored', async () => {
  await rejects(getMode(fakeDb(), ''), 'unauthorized');
  const db = fakeDb({ rows: [{ id: 'a', owner_user_id: 'u2', enabled: true }] });
  assert.equal((await getMode(db, 'u1')).enabled, false);
  await setMode(db, 'u1', true);
  assert.equal(db.store.find(r => r.id === 'a').enabled, true);
  const src = readFileSync('base44/functions/autopilot/entry.ts', 'utf8');
  assert.match(src, /setMode\(db, user\.id, body\.enabled\)/);
  assert.doesNotMatch(src, /body\.(owner_user_id|user_id)/);
  assert.doesNotMatch(src, /AutopilotPreference\.updateMany/);
});

test('no background claim: blocker always returned, worker still blocked', () => {
  const src = readFileSync('base44/functions/autopilot/entry.ts', 'utf8');
  assert.match(src, /ready: false, blocker: BACKGROUND_BLOCKER/);
  assert.match(BACKGROUND_BLOCKER, /Background Setup Required/);
  assert.match(readFileSync('base44/functions/autopilotWorker/entry.ts', 'utf8'), /SETUP_BLOCKER, \{ status: 503 \}/);
  const ui = readFileSync('src/pages/Autopilot.jsx', 'utf8') + readFileSync('src/components/autopilot/PersistentModeToggle.jsx', 'utf8');
  assert.doesNotMatch(ui, /Continue Server-Side\.'/);
});

test('mode change never sends, drafts, or adds OAuth scopes', () => {
  const mod = readFileSync('base44/shared/autopilotMode.ts', 'utf8');
  assert.doesNotMatch(mod, /dispatchAction|getCurrentAppUserConnection|SendEmail|scopes|localStorage|import /);
});

const ok = (data: any) => ({ data });
const defer = () => { let r: any, j: any; const p = new Promise((a, b) => { r = a; j = b; }); return { p, r, j }; };

test('UI: stale initial load does not overwrite a completed save', async () => {
  const load = defer();
  const ctl = createModeController((x: any) => x.action === 'get_mode' ? load.p : Promise.resolve(ok({ enabled: true })), () => {});
  const l = ctl.load();
  await ctl.save(true);
  load.r(ok({ enabled: false })); await l;
  assert.equal(ctl.state.enabled, true);
});

test('UI: concurrent saves blocked; error keeps last confirmed + retry', async () => {
  const s = defer();
  let calls = 0;
  const ctl = createModeController(() => { calls++; return calls === 1 ? Promise.resolve(ok({ enabled: true })) : s.p; }, () => {});
  await ctl.load();
  const a = ctl.save(false);
  assert.equal(await ctl.save(true), false); // rapid toggle ignored while saving
  s.j({ response: { data: { error: 'Your Change Was Not Saved.' } } }); await a;
  assert.equal(ctl.state.enabled, true);
  assert.equal(ctl.state.error, 'Your Change Was Not Saved.');
  assert.equal(calls, 2);
});

test('UI: load failure shows error, never flips to off', async () => {
  const ctl = createModeController(() => Promise.reject(new Error('net')), () => {});
  await ctl.load();
  assert.equal(ctl.state.enabled, null);
  assert.match(ctl.state.error, /Could Not Load/);
});