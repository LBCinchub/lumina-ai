import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse, writeAudit, writeSecurityEvent } from '../../shared/security.ts';

// Legacy VPS deployer V2. ALL external network deployment pushes are
// DISABLED for this release pending the governed plan-confirm-execute
// workflow. This function performs NO external fetch and contacts no
// external host.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);
    const db = base44.asServiceRole;

    await req.json().catch(() => ({}));

    await writeSecurityEvent(db, {
      eventType: "legacy_deploy_disabled",
      actorEmail: user.email,
      resourceType: "lbcDeployerV2",
      resourceId: "network_push",
      outcome: "blocked",
      metadata: "Legacy VPS network push disabled pending governed plan-confirm-execute.",
    });
    await writeAudit(db, {
      actorEmail: user.email,
      actionType: "legacy_vps_deploy",
      target: "network_push",
      status: "denied",
      resultSummary: "Legacy VPS deploy path disabled pending governed plan-confirm-execute.",
    });
    return Response.json(
      { error: "Legacy VPS deploy path disabled pending governed plan-confirm-execute." },
      { status: 503 }
    );
  } catch (e) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});