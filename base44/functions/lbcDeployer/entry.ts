import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse, writeAudit, writeSecurityEvent } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

function incrementVersion(current = "1.0.0") {
  const parts = current.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

// Legacy VPS deploy path. External push to the mother node is DISABLED for
// this release pending the governed plan-confirm-execute workflow. Only the
// local `stage` preview (no external side effect) remains. This function
// performs NO external fetch.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);
    const db = base44.asServiceRole;

    const { action, components = [] } = await req.json();

    const states = await db.entities.LuminaState.list();
    const state = states[0];

    if (action === 'stage') {
      const version = incrementVersion(state?.version || "1.0.0");
      const manifest = { version, timestamp: Date.now(), components };
      const signature = await signVpsPayload(manifest);
      if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });
      return Response.json({ success: true, manifest: { ...manifest, signature } });
    }

    if (action === 'push') {
      await writeSecurityEvent(db, {
        eventType: "legacy_deploy_disabled",
        actorEmail: user.email,
        resourceType: "lbcDeployer",
        resourceId: "push",
        outcome: "blocked",
        metadata: "Legacy VPS push disabled pending governed plan-confirm-execute.",
      });
      await writeAudit(db, {
        actorEmail: user.email,
        actionType: "legacy_vps_deploy",
        target: "mother_node:push",
        status: "denied",
        resultSummary: "Legacy VPS deploy path disabled pending governed plan-confirm-execute.",
      });
      return Response.json(
        { error: "Legacy VPS deploy path disabled pending governed plan-confirm-execute." },
        { status: 503 }
      );
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});