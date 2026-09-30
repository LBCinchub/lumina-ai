import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Invoked by the "Autopilot Status Alerts" workflow whenever an AutopilotRun's
// status changes. Creates an in-app notification for the run's owner only.
const LABELS = {
  queued: 'Queued', running: 'Running', awaiting_input: 'Needs Your Answer',
  awaiting_approval: 'Needs Your Approval', blocked: 'Blocked', paused: 'Paused',
  completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { run_id } = await req.json();
    if (!run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 });

    const db = base44.asServiceRole;
    const run = await db.entities.AutopilotRun.get(run_id).catch(() => null);
    if (!run) return Response.json({ skipped: 'run not found' });
    const owner = await db.entities.User.get(run.owner_user_id).catch(() => null);
    if (!owner?.email) return Response.json({ skipped: 'owner not found' });

    const steps = run.steps || [];
    const done = steps.filter(s => s.status === 'completed').length;
    const goal = String(run.goal || 'Autopilot task').slice(0, 80);
    const label = LABELS[run.status] || run.status;
    const detail =
      run.status === 'awaiting_approval' ? 'Review the exact draft and approve or edit it before anything is sent.' :
      run.status === 'awaiting_input' ? (run.clarifying_question || 'Autopilot needs an answer to continue.') :
      run.status === 'blocked' ? (run.blocked_reason || 'This run is blocked.') :
      run.status === 'failed' ? ((steps.find(s => s.status === 'failed')?.error) || 'A step failed.') :
      run.status === 'completed' ? (run.final_summary ? String(run.final_summary).slice(0, 300) : 'All steps finished.') :
      '';

    await db.entities.UserNotification.create({
      title: `${run.status === 'awaiting_approval' ? 'Approval Required' : `Autopilot ${label}`}: ${goal}`,
      body: `${steps.length ? `Steps ${done}/${steps.length} complete. ` : ''}${detail}`.trim(),
      kind: 'autopilot',
      link: '/autopilot',
      is_read: false,
      owner_email: owner.email,
    });
    return Response.json({ ok: true });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}