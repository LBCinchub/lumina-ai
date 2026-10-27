// Library saves from unattended runs. The scheduler has no per-user session,
// so a background "Save As Document" step keeps the compiled document on the
// owner's own run and marks it PENDING. The next time the owner is signed in,
// the document is saved with THEIR user-scoped client (RLS stamps ownership).
// Nothing is ever written to a library under another identity.

export const PENDING_ARTIFACT = 'pending';

const titleOf = (content, fallback) =>
  String((String(content).match(/^#\s+(.+)$/m) || [])[1] || fallback || 'Autopilot Document').slice(0, 120);

export async function flushPendingArtifacts(db, userClient, ownerId) {
  const runs = await db.entities.AutopilotRun.filter(
    { owner_user_id: ownerId }, '-updated_date', 20
  ).catch(() => []);
  let saved = 0;
  for (const run of runs) {
    if (run.owner_user_id !== ownerId) continue; // defensive owner check beyond the query
    let changed = false;
    const steps = [];
    for (const s of run.steps || []) {
      if (s.artifact_document_id === PENDING_ARTIFACT && s.output) {
        const doc = await userClient.entities.Document.create({ title: titleOf(s.output, s.title), content: s.output, status: 'ready' }).catch(() => null);
        if (doc?.id) { steps.push({ ...s, artifact_document_id: doc.id }); changed = true; saved++; continue; }
      }
      steps.push(s);
    }
    if (changed) await db.entities.AutopilotRun.update(run.id, { steps }).catch(() => {});
  }
  return saved;
}