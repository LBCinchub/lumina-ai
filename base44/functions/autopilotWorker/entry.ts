import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runOneStep, auditEntry } from '../../shared/autopilotEngine.ts';

// Scheduled Autopilot continuation worker. Invoked every 5 minutes by the
// "Autopilot Continuation" workflow. Durable, bounded, idempotent:
//  - Only processes runs whose owner explicitly opted in (AutopilotPreference).
//  - Advances AT MOST ONE pending step per run, per invocation, guarded by
//    lease_until — no concurrent double-runs, no infinite paid loops.
//  - Steps needing a user-scoped client (document.generate) are paused for
//    foreground completion rather than faked.
//  - Blocking a dispatch-destined step cannot happen here: only Executable
//    capabilities planned in the foreground ever reach 'running'.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // The workflow invokes without a user session; direct browser calls are
    // rejected (mirror of runUserAgentTasks' auth model).
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = base44.asServiceRole;
    const prefs = await service.entities.AutopilotPreference.filter(
      { enabled: true }, 'created_date', 200
    ).catch(() => []);
    const optedIn = new Set(prefs.map(p => p.owner_user_id));
    if (optedIn.size === 0) return Response.json({ advanced: 0, skipped: 0 });

    const open = (await Promise.all([
      service.entities.AutopilotRun.filter({ status: 'running' }, 'created_date', 100),
      service.entities.AutopilotRun.filter({ status: 'queued' }, 'created_date', 100),
    ]).catch(() => [[], []])).flat();

    let advanced = 0, skipped = 0, deferred = 0;
    for (const run of open) {
      if (advanced >= 10) break; // bounded batch per invocation
      if (!optedIn.has(run.owner_user_id)) { skipped++; continue; }
      if (run.lease_until && new Date(run.lease_until).getTime() > Date.now()) { skipped++; continue; }
      if (run.status === 'queued') {
        // A run the browser never started (closed between plan and start).
        await service.entities.AutopilotRun.update(run.id, {
          status: 'running', lease_until: null,
          audit: [...(run.audit || []), auditEntry('started', 'Execution started by the scheduled continuation')],
        });
      }
      const next = (run.steps || []).find(s => s.status === 'pending' || s.status === 'running');
      if (next?.capability_id === 'document.generate') {
        // Needs the owner's user-scoped client (RLS ownership stamping) —
        // paused for foreground completion, outputs preserved.
        await service.entities.AutopilotRun.update(run.id, {
          status: 'paused', lease_until: null,
          audit: [...(run.audit || []), auditEntry('paused', 'Needs You Online To Save The Document — Resume In Autopilot')],
        });
        deferred++;
        continue;
      }
      if (!next) { skipped++; continue; }
      const result = await runOneStep(service, run.id, { ownerId: run.owner_user_id, agent: null, docs: [], userClient: null }).catch(() => null);
      if (result && ['completed', 'failed', 'blocked', 'paused'].includes(result.status)) advanced++;
      else skipped++;
    }
    return Response.json({ advanced, skipped, deferred });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}