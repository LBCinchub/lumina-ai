// Deterministic security tests for the LBC AI Autopilot extension.
// Runner: npx vitest run tests/autopilotSecurity.test.ts
// NOTE: the repo's other shared tests use Deno.test; no Deno runtime exists in
// this workspace, so these use vitest so they can ACTUALLY be executed.
// No test sends, posts, or uploads anything — all dispatch targets are mocks
// or fail-closed paths.
import { test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  DESTINATIONS, destinationUsable, publicAccounts,
  validateFields, draftHash, checkApproval, dispatchAction,
} from '../base44/shared/autopilotActions.ts';
import { REGISTRY, NEEDS_ONLINE_IDS } from '../base44/shared/autopilotRegistry.ts';

test('every requested social destination reports needs_setup until its OAuth app is reviewed', () => {
  for (const p of ['instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube']) {
    assert.equal(DESTINATIONS[p].status, 'needs_setup', p);
    assert.match(DESTINATIONS[p].reason, /Setup Required/);
  }
});

test('LBC Hub destinations stay blocked, not faked', () => {
  assert.equal(DESTINATIONS.lbc_hub_social.status, 'blocked');
  assert.equal(DESTINATIONS.lbc_hub_marketplace.status, 'blocked');
  assert.match(DESTINATIONS.lbc_hub_social.reason, /Security Review/);
});

test('gmail destination is usable only with the owner connected on Ultra', () => {
  assert.match(destinationUsable('gmail', 'email_send', false, { plan: 'ultra', gmailConnected: false }), /Connect Gmail/);
  assert.match(destinationUsable('gmail', 'email_send', false, { plan: 'free', gmailConnected: true }), /Ultra/);
  assert.equal(destinationUsable('gmail', 'email_send', false, { plan: 'ultra', gmailConnected: true }), null);
  assert.equal(destinationUsable('gmail', 'email_draft', false, { plan: 'ultra', gmailConnected: true }), null);
  // a social kind can never route to gmail
  assert.ok(destinationUsable('gmail', 'social_post', false, { plan: 'ultra', gmailConnected: true }));
});

test('the mock sandbox stays admin-only and clearly labeled mock', () => {
  assert.ok(destinationUsable('mock_sandbox', 'social_post', false));
  assert.equal(destinationUsable('mock_sandbox', 'social_post', true), null);
  assert.equal(DESTINATIONS.mock_sandbox.mock, true);
});

test('email field validation rejects bad recipients, missing content and bad thread refs; bounds oversize bodies', () => {
  const ok = validateFields('email_send', { to: 'a@b.co', subject: 'Hi', body: 'Hello' }, []);
  assert.deepEqual(ok.missing, []);
  assert.deepEqual(ok.errors, []);
  assert.match(validateFields('email_send', { to: 'nope', subject: 'Hi', body: 'x' }, []).errors[0], /Recipient/);
  assert.deepEqual(validateFields('email_send', { to: 'a@b.co', body: 'x' }, []).missing, ['subject']);
  assert.ok(validateFields('email_send', { to: 'a@b.co', subject: 's', body: '' }, []).missing.includes('body'));
  assert.ok(validateFields('email_send', { to: 'a@b.co', subject: 's', body: 'x', thread_id: '../evil' }, []).errors.length > 0);
  assert.ok(validateFields('email_send', { to: 'a@b.co', subject: 's', body: 'x', in_reply_to: '<a b@c>' }, []).errors.length > 0);
  const big = validateFields('email_send', { to: 'a@b.co', subject: 's', body: 'x'.repeat(50000) }, []);
  assert.equal(big.fields.body.length, 20000);
  const multi = validateFields('email_send', { to: 'a@b.co, c@d.co', subject: 's', body: 'x' }, []);
  assert.deepEqual(multi.errors, []);
});

test('approval gate refuses tampering, replay and expiry; edits rebind the hash', async () => {
  const draft = { kind: 'email_send', destination_id: 'gmail', fields: { to: 'a@b.co', subject: 's', body: 'hi' }, copy: 'hi', attachments: [] };
  const hash = await draftHash(draft);
  const future = Date.now() + 60000;
  assert.equal(checkApproval({ content_hash: hash, expires_at: new Date(future).toISOString() }, hash, Date.now()), null);
  assert.match(checkApproval({ content_hash: 'deadbeef', expires_at: new Date(future).toISOString() }, hash, Date.now()), /Changed/);
  assert.match(checkApproval({ content_hash: hash, expires_at: new Date(future).toISOString(), used_at: '2026-01-01T00:00:00Z' }, hash, Date.now()), /Already Used/);
  assert.match(checkApproval({ content_hash: hash, expires_at: new Date(future).toISOString(), claim: 'x' }, hash, Date.now()), /Already Used/);
  assert.match(checkApproval({ content_hash: hash, expires_at: new Date(Date.now() - 1000).toISOString() }, hash, Date.now()), /Expired/);
  expect(await draftHash({ ...draft, copy: 'hi!' })).not.toBe(hash);
});

test('dispatch: mock receipts only from the mock; unknown destinations and missing tokens fail closed', async () => {
  const mockDraft = { kind: 'social_post', destination_id: 'mock_sandbox', fields: { text: 'hi' }, copy: 'hi', attachments: [] };
  const h = await draftHash(mockDraft);
  const receipt = await dispatchAction(mockDraft, h, {});
  assert.equal(receipt.mock, true);
  assert.match(receipt.note, /Nothing Was Published/);
  await expect(dispatchAction({ ...mockDraft, destination_id: 'instagram' }, h, {})).rejects.toThrow(/destination_unavailable/);
  const gmailDraft = { kind: 'email_send', destination_id: 'gmail', fields: { to: 'a@b.co', subject: 's', body: 'b' }, copy: 'b', attachments: [] };
  await expect(dispatchAction(gmailDraft, await draftHash(gmailDraft), {})).rejects.toThrow(/no_user_token/);
});

test('accounts view lists every requested destination with honest statuses', () => {
  const rows = publicAccounts({ gmailConnected: false, plan: 'ultra' });
  const providers = rows.map(r => r.provider);
  for (const p of ['gmail', 'instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'youtube', 'lbc_hub_social', 'lbc_hub_marketplace']) {
    assert.ok(providers.includes(p), p);
  }
  assert.equal(rows.find(r => r.provider === 'gmail').status, 'needs_connection');
  assert.equal(publicAccounts({ gmailConnected: true, plan: 'ultra' }).find(r => r.provider === 'gmail').status, 'ready');
  assert.equal(publicAccounts({ gmailConnected: true, plan: 'free' }).find(r => r.provider === 'gmail').status, 'needs_permission');
  assert.equal(rows.find(r => r.provider === 'lbc_hub_social').status, 'blocked');
});

test('registry: email capabilities are foreground-gated; destructive caps stay unsupported', () => {
  assert.equal(REGISTRY['email.send'].status, 'available');
  assert.equal(REGISTRY['email.send'].requires, 'gmail_connection');
  assert.equal(REGISTRY['email.send'].confirmation, 'exact_plan');
  assert.equal(REGISTRY['email.organize'].status, 'needs_permission');
  for (const c of ['email.send', 'email.draft', 'email.read', 'document.generate']) {
    assert.ok(NEEDS_ONLINE_IDS.includes(c), c);
  }
  assert.equal(REGISTRY['deploy.app'].status, 'unsupported');
  assert.equal(REGISTRY['payment.execute'].status, 'unsupported');
});

test('AutopilotRun: server-only writes and ownership-scoped reads preserved; fencing token exists', () => {
  const schema = JSON.parse(readFileSync('base44/entities/AutopilotRun.jsonc', 'utf8'));
  assert.deepEqual(schema.rls.create.user_condition, { role: '__server_only__' });
  assert.deepEqual(schema.rls.update.user_condition, { role: '__server_only__' });
  assert.deepEqual(schema.rls.read, { 'data.owner_user_id': '{{user.id}}' });
  assert.deepEqual(schema.properties.kind.enum, ['task', 'social_post', 'marketplace_listing', 'email']);
  assert.ok(schema.properties.lease_token, 'fencing token must exist');
});

test('no client-side writes to AutopilotRun', () => {
  const violations = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        if (/entities\.AutopilotRun\.(create|update|bulkCreate|bulkUpdate|updateMany|deleteMany|delete)\b/.test(readFileSync(path, 'utf8'))) {
          violations.push(path);
        }
      }
    }
  };
  walk('src');
  assert.deepEqual(violations, []);
});

test('scheduled workers refuse to execute without a verified admin session', () => {
  for (const f of ['autopilotWorker', 'runUserAgentTasks']) {
    const src = readFileSync(`base44/functions/${f}/entry.ts`, 'utf8');
    assert.match(src, /scheduler_auth_blocker/, f);
    // The gate must reject a MISSING user, not only non-admins.
    assert.match(src, /!user \|\| user\.role !== 'admin'/, f);
  }
});

test('Gmail connect treats connectAppUser as a URL string and handles popup blocking', () => {
  for (const f of ['src/components/settings/GmailSection.jsx', 'src/components/autopilot/ConnectedAccounts.jsx']) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /\{\s*url\s*\}\s*=\s*await base44\.connectors\.connectAppUser/, f);
    assert.match(src, /await base44\.connectors\.connectAppUser/, f);
    assert.match(src, /Blocked The Pop-Up/, f);
    assert.match(src, /\/\^https:/, f);
  }
});

test('Gmail modules never log token material', () => {
  for (const f of ['base44/shared/gmailMime.ts', 'base44/functions/gmailOperations/entry.ts']) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /console\./, f);
  }
});