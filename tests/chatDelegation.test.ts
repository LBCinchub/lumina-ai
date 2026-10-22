// Chat-first Autopilot delegation regressions. Synthetic mocks only — no
// network, no email, no posts, no production records.
import { test, expect, vi } from 'vitest';
import { detectDelegation, detectActionIntent } from '../base44/shared/actionIntent.ts';
import { findReusableRun, startDelegatedRun, delegationMessage, parseDelegationMarker, stripDelegationMarker } from '../base44/shared/chatDelegation.ts';
import { draftHash, checkApproval } from '../base44/shared/autopilotActions.ts';
import { pickRunToDrive, tryAcquireLock, releaseLock, isAuthStop, MAX_CONSECUTIVE_ERRORS } from '../src/lib/autopilotSessionDriver.js';
import { taskCardSummary } from '../src/lib/chatTaskSummary.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const mockDb = (rows = []) => ({ entities: { AutopilotRun: { filter: vi.fn(async (q) => rows.filter(r => r.owner_user_id === q.owner_user_id && r.goal === q.goal)) } } });
const mockClient = (res) => ({ functions: { invoke: vi.fn(async () => res) } });
const U1 = { id: 'user1', email: 'a@x.test' };

test('explicit delegation requests are detected', () => {
  expect(detectDelegation('Research the Toronto EV market and prepare a report')).toBeTruthy();
  expect(detectDelegation('Summarize my inbox and draft replies')).toBeTruthy();
  expect(detectDelegation('autopilot: compare three CRM tools')).toBe('compare three CRM tools');
});

test('advice, questions and plain chat do not delegate', () => {
  for (const m of ['How should I research the EV market?', 'What do you think of my plan?', 'Give me advice on a report', 'hello there friend', 'Should I prepare a report?']) {
    expect(detectDelegation(m)).toBeNull();
  }
});

test('draft-only email asks still go to the approval pipeline, never a send', () => {
  expect(detectActionIntent('draft an email to my landlord')).toBe('email_send');
});

test('chat delegation creates exactly ONE run with server-bound conversation', async () => {
  const client = mockClient({ data: { run_id: 'run_abc123' } });
  const out = await startDelegatedRun({ base44: client, db: mockDb(), user: U1, conversationId: 'conv1', goal: 'Research X and prepare a report' });
  expect(out).toEqual({ run_id: 'run_abc123', reused: false });
  expect(client.functions.invoke).toHaveBeenCalledTimes(1);
  expect(client.functions.invoke.mock.calls[0][1]).toEqual({ action: 'create', goal: 'Research X and prepare a report', context: { conversation_id: 'conv1' } });
});

test('double click / retry / second tab reuses the run instead of creating another', async () => {
  const existing = { id: 'run_abc123', owner_user_id: 'user1', goal: 'Research X and prepare a report', context: { conversation_id: 'conv1' }, status: 'running', created_date: new Date().toISOString() };
  const client = mockClient({ data: { run_id: 'NEW' } });
  const out = await startDelegatedRun({ base44: client, db: mockDb([existing]), user: U1, conversationId: 'conv1', goal: 'Research X and prepare a report' });
  expect(out).toEqual({ run_id: 'run_abc123', reused: true });
  expect(client.functions.invoke).not.toHaveBeenCalled();
});

test('two users / two conversations never reuse each other\'s run', () => {
  const r = { id: 'r1', owner_user_id: 'user2', goal: 'g', context: { conversation_id: 'conv1' }, status: 'running', created_date: new Date().toISOString() };
  expect(findReusableRun([r], { ownerId: 'user1', conversationId: 'conv1', goal: 'g', now: Date.now() })).toBeNull();
  expect(findReusableRun([{ ...r, owner_user_id: 'user1' }], { ownerId: 'user1', conversationId: 'conv2', goal: 'g', now: Date.now() })).toBeNull();
});

test('server refusal is reported honestly, no run marker', async () => {
  const client = { functions: { invoke: vi.fn(async () => { throw { response: { data: { error: 'One Autopilot Task Is Already Running' } } }; }) } };
  const out = await startDelegatedRun({ base44: client, db: mockDb(), user: U1, conversationId: 'c', goal: 'Research X and prepare a report' });
  const msg = delegationMessage(out);
  expect(parseDelegationMarker(msg)).toBeNull();
  expect(msg).toMatch(/Already Running/);
  expect(msg).toMatch(/Nothing was sent/);
});

test('marker round-trips for refresh rehydration and is stripped from model history', () => {
  const msg = delegationMessage({ run_id: 'run_abc123' });
  expect(parseDelegationMarker(msg)?.runId).toBe('run_abc123');
  expect(stripDelegationMarker(msg)).not.toMatch(/__AUTOPILOT__/);
  expect(parseDelegationMarker('__AUTOPILOT__../../x\nhi')).toBeNull();
});

test('driver advances only running runs; pause/cancel/block/approval stop dispatch', () => {
  const now = new Date().toISOString();
  for (const status of ['paused', 'cancelled', 'blocked', 'awaiting_approval', 'awaiting_input', 'completed', 'failed']) {
    expect(pickRunToDrive([{ id: 'a', status, created_date: now }])).toBeNull();
  }
  expect(pickRunToDrive([{ id: 'a', status: 'running', created_date: now }])?.id).toBe('a');
});

test('driver retries are bounded', () => {
  expect(pickRunToDrive([{ id: 'a', status: 'running' }], { a: MAX_CONSECUTIVE_ERRORS })).toBeNull();
});

test('revoked/missing auth stops the driver', () => {
  expect(isAuthStop({ response: { status: 401 } })).toBe(true);
  expect(isAuthStop({ response: { status: 403 } })).toBe(true);
  expect(isAuthStop({ response: { status: 500 } })).toBe(false);
});

test('only one tab drives at a time', () => {
  const s = memStore();
  expect(tryAcquireLock(s, 'tabA', 1000)).toBe(true);
  expect(tryAcquireLock(s, 'tabB', 2000)).toBe(false);
  releaseLock(s, 'tabA');
  expect(tryAcquireLock(s, 'tabB', 3000)).toBe(true);
  expect(tryAcquireLock(s, 'tabA', 3000 + 60000)).toBe(true); // expired lock
});

test('approval expiry and edited payload both prevent send', async () => {
  const draft = { kind: 'email_send', destination_id: 'gmail', fields: { to: 'a@x.test', subject: 's', body: 'b' }, copy: 'b', attachments: [] };
  const hash = await draftHash(draft);
  const app = { content_hash: hash, expires_at: new Date(Date.now() + 60000).toISOString(), used_at: null };
  expect(checkApproval(app, hash, Date.now())).toBeFalsy();
  expect(checkApproval({ ...app, expires_at: new Date(Date.now() - 1).toISOString() }, hash, Date.now())).toBeTruthy();
  const edited = await draftHash({ ...draft, fields: { ...draft.fields, to: 'evil@x.test' } });
  expect(checkApproval(app, edited, Date.now())).toBeTruthy();
});

test('card never claims completion for mock outcomes, never implies offline running', () => {
  expect(taskCardSummary({ status: 'completed', receipt: { mock: true }, final_summary: 'Sent' }).headline).toMatch(/Test Only/);
  expect(taskCardSummary({ status: 'running', steps: [] }).nextStep).toMatch(/Not Offline/);
  expect(taskCardSummary({ status: 'blocked', blocked_reason: 'Connect Gmail To Continue.' }).nextStep).toBe('Connect Gmail To Continue.');
});