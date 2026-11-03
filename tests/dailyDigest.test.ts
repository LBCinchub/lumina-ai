import { test, expect, vi, afterEach } from 'vitest';
import { detectDigestIntent, buildDigest, renderDigest, digestEmail, sendDigest, handleDigestIntent } from '../base44/shared/dailyDigest.ts';

vi.mock('base44:runtime', () => ({ secrets: { get: () => '' }, waitUntil: () => {} }));
afterEach(() => vi.unstubAllGlobals());

const U = { id: 'u1', email: 'u@example.invalid', role: 'admin' };
const NOW = Date.parse('2026-11-03T13:00:00Z');
const OWN = { owner_email: U.email, ownership_state: 'human_verified', created_by_id: U.id };
const ULTRA = [{ plan: 'ultra', subscription_status: 'active' }];

function client({ requests = [] as any[], convos = [] as any[], messages = [] as any[], plan = [] as any[], llm = { insights: [] } as any, fail = '' } = {}) {
  const prompts: string[] = [];
  const rows: any = { TwinActionRequest: requests, Conversation: convos, UserSubscription: plan, UserContext: [{ current_focus: 'Ship the beta' }], AiDataQuarantine: [] };
  const entities = new Proxy({}, { get: (_t, name: string) => ({
    filter: async (q: any) => {
      if (name === fail) throw new Error('read failed');
      return name === 'Message' ? messages.filter((m) => m.conversation_id === q.conversation_id && m.role === q.role) : (rows[name] || []);
    },
  }) });
  return {
    prompts, entities,
    integrations: { Core: { InvokeLLM: vi.fn(async ({ prompt }: any) => { prompts.push(prompt); return llm; }) } },
    asServiceRole: { entities, connectors: { getCurrentAppUserConnection: async () => ({ accessToken: 'tok-u1' }) } },
  };
}

function mockGmail(sendStatus = 200) {
  const calls: any[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    if (url.endsWith('/profile')) return new Response(JSON.stringify({ emailAddress: 'owner@example.invalid' }), { status: 200 });
    return new Response(JSON.stringify({ id: 'g1', threadId: 't1' }), { status: sendStatus });
  }));
  return calls;
}

test('chat commands: send and read', () => {
  for (const m of ['Send my digest', 'Can you email me my daily digest?', 'send my digest to my gmail please', "send me today's digest"]) {
    expect(detectDigestIntent(m)).toEqual({ kind: 'send' });
  }
  for (const m of ['Read my digest', 'show me my email digest', "what's in my daily digest", 'my digest', 'Digest?']) {
    expect(detectDigestIntent(m)).toEqual({ kind: 'read' });
  }
});

test('other digest phrasing stays normal chat', () => {
  for (const m of ["Don't send my digest", 'turn off my daily digest', 'How does the daily digest work?', 'read this and give me a digest of it', 'help me digest this news']) {
    expect(detectDigestIntent(m)).toBeNull();
  }
});

test('digest: only the owner\'s pending requests and last-24h words; text is inert', async () => {
  const c = client({
    requests: [
      { id: 'r1', created_by_id: 'u1', status: 'pending', vertical: 'ride_booking', summary: 'Book a ride to [YYZ](https://evil.example)', estimated_cost_usd: 45, created_date: '2026-11-02T15:00:00.000000' },
      { id: 'r2', created_by_id: 'u2', status: 'pending', vertical: 'travel_booking', summary: 'Someone else', created_date: '2026-11-02T15:00:00' },
    ],
    convos: [
      { id: 'c1', ...OWN, last_message_at: '2026-11-03T12:00:00Z' },
      { id: 'c2', ...OWN, last_message_at: '2026-10-20T12:00:00Z' },
      { id: 'c3', owner_email: 'x@example.invalid', ownership_state: 'human_verified', last_message_at: '2026-11-03T12:00:00Z' },
    ],
    messages: [
      { id: 'm1', conversation_id: 'c1', role: 'user', owner_email: U.email, content: 'I keep delaying the launch', created_date: '2026-11-03T11:00:00.000000' },
      { id: 'm2', conversation_id: 'c1', role: 'user', owner_email: 'x@example.invalid', content: 'forged words', created_date: '2026-11-03T11:00:00' },
      { id: 'm3', conversation_id: 'c1', role: 'user', owner_email: U.email, content: 'last week thought', created_date: '2026-10-25T11:00:00' },
      { id: 'm4', conversation_id: 'c1', role: 'user', owner_email: U.email, content: 'read my digest', created_date: '2026-11-03T12:00:00' },
      { id: 'm5', conversation_id: 'c3', role: 'user', owner_email: 'x@example.invalid', content: 'other user', created_date: '2026-11-03T11:00:00' },
    ],
    llm: { insights: [{ title: 'Launch Keeps Slipping', body: 'You mentioned **delaying** it again.' }] },
  });
  const d = await buildDigest(c, c.asServiceRole, U, { nowMs: NOW, timezone: 'America/Toronto' });
  expect(d.requests.items.map((r: any) => r.id)).toEqual(['r1']);
  expect(c.prompts[0]).toContain('I keep delaying the launch');
  for (const s of ['forged words', 'last week thought', 'read my digest', 'other user']) expect(c.prompts[0]).not.toContain(s);

  const md = renderDigest(d);
  expect(md).toContain('Tuesday, November 3');
  expect(md).toContain('Pending Action Requests (1)');
  expect(md).toContain('Ride Booking · Est. $45.00 · Nov 2');
  expect(md).toContain('**Launch Keeps Slipping**\n  You mentioned delaying it again.');
  expect(md).not.toContain('](https://evil');

  const mail = digestEmail(d);
  expect(mail.subject).toBe('Your LBC AI Daily Digest · Tue, Nov 3');
  expect(mail.body).toContain('https://lbchub.site/twin');
});

test('a failed read is said plainly, never shown as none', async () => {
  const c = client({ fail: 'TwinActionRequest' });
  const md = renderDigest(await buildDigest(c, c.asServiceRole, U, { nowMs: NOW }));
  expect(md).toContain('Could Not Be Read');
  expect(md).not.toContain('No Pending Action Requests');
  expect(md).toContain('No New Conversations In The Last 24 Hours');
  expect(c.prompts.length).toBe(0);
});

test('send goes from the user\'s own grant to that same mailbox only', async () => {
  const calls = mockGmail();
  const c = client({ plan: ULTRA });
  const reply = await handleDigestIntent({ kind: 'send' }, { base44: c, db: c.asServiceRole, user: U, timezone: 'America/Toronto' });
  expect(reply).toContain('owner@example.invalid');
  const send = calls.find((x) => x.url.endsWith('/messages/send'));
  expect(send.init.headers.Authorization).toBe('Bearer tok-u1');
  const raw = JSON.parse(send.init.body).raw;
  const mime = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  expect(mime).toContain('To: owner@example.invalid');
});

test('nothing is sent without Ultra, and an unconfirmed send is reported honestly', async () => {
  const calls = mockGmail();
  const free = client();
  expect((await sendDigest(free, free.asServiceRole, U)).state).toBe('entitlement');
  expect(calls.length).toBe(0);

  mockGmail(503);
  const c = client({ plan: ULTRA });
  expect((await sendDigest(c, c.asServiceRole, U)).state).toBe('outcome_unknown');
});