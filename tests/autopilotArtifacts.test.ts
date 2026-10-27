import { test } from 'vitest';
import assert from 'node:assert/strict';
import { flushPendingArtifacts, PENDING_ARTIFACT } from '../base44/shared/autopilotArtifacts.ts';

function fixture() {
  const runs = [
    { id: 'r1', owner_user_id: 'u1', steps: [{ title: 'Doc', output: '# Tips\nbody', artifact_document_id: PENDING_ARTIFACT }] },
    { id: 'r2', owner_user_id: 'u2', steps: [{ title: 'Other', output: '# X', artifact_document_id: PENDING_ARTIFACT }] },
  ];
  const created = [];
  const db = { entities: { AutopilotRun: {
    filter: async (q) => runs.filter(r => r.owner_user_id === q.owner_user_id),
    update: async (id, d) => Object.assign(runs.find(r => r.id === id), d),
  } } };
  const userClient = { entities: { Document: { create: async (d) => { created.push(d); return { id: 'd' + created.length }; } } } };
  return { runs, created, db, userClient };
}

test('pending library documents save only for the signed-in owner, via their own client', async () => {
  const f = fixture();
  assert.equal(await flushPendingArtifacts(f.db, f.userClient, 'u1'), 1);
  assert.equal(f.created[0].title, 'Tips');
  assert.equal(f.runs[0].steps[0].artifact_document_id, 'd1');
  assert.equal(f.runs[1].steps[0].artifact_document_id, PENDING_ARTIFACT);
  assert.equal(await flushPendingArtifacts(f.db, f.userClient, 'u1'), 0);
});