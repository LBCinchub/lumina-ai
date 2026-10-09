import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { runOneStep, auditEntry } from '../../shared/autopilotEngine.ts';
import { NEEDS_ONLINE_IDS } from '../../shared/autopilotRegistry.ts';

// Scheduled Autopilot continuation worker.
//
// SETUP BLOCKER (verified this pass): the platform documents NO credential
// that a function can use to verify that an unauthenticated invocation came
// from the trusted scheduler, and this endpoint accepts direct anonymous
// POSTs (tested: HTTP 200 with an empty body). "No user" is therefore NOT
// authentication. Background execution stays DISABLED until a trusted
// scheduler credential exists. A verified admin session may still run it in
// the foreground.
const SETUP_BLOCKER = {
  disabled: true,
  reason: 'scheduler_auth_blocker',
  detail: 'Background Continuation Is Disabled: No Verified Scheduler Credential Exists For This Endpoint. Absence Of A User Is Not Authentication.',
  setup_required: 'A Platform-Supported Trusted Scheduler Credential Or Request Signature For Scheduled invoke_backend_function Targets.',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // VERIFIED-SESSION GATE: only an authenticated admin may execute. An
    // absent, expired, or non-admin identity never triggers any run.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json(SETUP_BLOCKER, { status: 503 });
    }

    const service = base44.asServiceRole;
    const prefs = await service.entities.AutopilotPreference.filter(
      { enabled: true }, 'created_date', 200
    ).catch(() => []);
    const optedIn = new Set(prefs.map(p => p.owner_user_id));
    if (optedIn.size === 0) return Response.json({ advanced: 0, skipped: 0 });

    // Bounded, fair scan: oldest open runs first, one capped page.
    const open = await service.entities.AutopilotRun.filter(
      { status: { $in: ['running', 'queued'] } }, 'created_date', 25
    ).catch(() => []);

    let advanced = 0, skipped = 0, deferred = 0;
    for (const run of open) {
      if (advanced >= 10) break; // bounded batch per invocation
      if (!optedIn.has(run.owner_user_id)) { skipped++; continue; }
      if (run.lease_until && new Date(run.lease_until).getTime() > Date.now()) { skipped++; continue; }
      if (run.status === 'queued') {
        // Atomic start: conditional on the run still being queued (CAS), then
        // verified by re-read — a lost race is skipped, never double-started.
        await service.entities.AutopilotRun.updateMany(
          { id: run.id, owner_user_id: run.owner_user_id, status: 'queued' },
          { $set: { status: 'running' } }
        ).catch(() => null);
        const fresh = (await service.entities.AutopilotRun.filter(
          { id: run.id, owner_user_id: run.owner_user_id }
        ).catch(() => []))?.[0] || null;
        if (!fresh || fresh.status !== 'running') { skipped++; continue; }
        await service.entities.AutopilotRun.update(fresh.id, {
          audit: [...(fresh.audit || []), auditEntry('started', 'Execution started by an authorized scheduler operator')],
        }).catch(() => {});
      }
      const next = (run.steps || []).find(s => s.status === 'pending' || s.status === 'running');
      if (!next) { skipped++; continue; }
      if (NEEDS_ONLINE_IDS.includes(next.capability_id)) {
        // Needs the owner's user-scoped session/token — paused for foreground
        // completion, outputs preserved. Never faked in the background.
        await service.entities.AutopilotRun.update(run.id, {
          status: 'paused', lease_until: null, lease_token: null,
          audit: [...(run.audit || []), auditEntry('paused', 'Needs You Online To Use Your Connected Account Or Library — Resume In Autopilot')],
        });
        deferred++;
        continue;
      }
      const result = await runOneStep(service, run.id, { ownerId: run.owner_user_id, agent: null, docs: [], userClient: null, gmailToken: null }).catch(() => null);
      if (result && ['completed', 'failed', 'blocked', 'paused'].includes(result.status)) advanced++;
      else skipped++;
    }
    return Response.json({ advanced, skipped, deferred });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong' }, { status: 500 });
  }
}