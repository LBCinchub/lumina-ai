import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { requireFounderOrAdmin, errorResponse } from '../../shared/security.ts';
import { signVpsPayload } from '../../shared/vps.ts';

const MOTHER_NODE_URL = "https://api.lbc.network/v1/deploy";

function incrementVersion(current = "1.0.0") {
  const parts = current.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { action, components = [] } = await req.json();

    const states = await base44.asServiceRole.entities.LuminaState.list();
    const state = states[0];

    if (action === 'stage') {
      const version = incrementVersion(state?.version || "1.0.0");
      const manifest = { version, timestamp: Date.now(), components };
      const signature = await signVpsPayload(manifest);
      if (!signature) return Response.json({ error: 'Service unavailable' }, { status: 503 });
      return Response.json({ success: true, manifest: { ...manifest, signature } });
    }

    if (action === 'push') {
      const { manifest } = await req.json().catch(() => ({}));
      const version = incrementVersion(state?.version || "1.0.0");
      const builtManifest = manifest || { version, timestamp: Date.now(), components };
      if (!builtManifest.signature) {
        const sig = await signVpsPayload(builtManifest);
        if (!sig) return Response.json({ error: 'Service unavailable' }, { status: 503 });
        builtManifest.signature = sig;
      }

      const response = await fetch(MOTHER_NODE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LBC-Signature': builtManifest.signature
        },
        body: JSON.stringify(builtManifest)
      });

      if (!response.ok) {
        if (state) {
          const debt = [...(state.technical_debt || []), `Deployment_Failed: MOTHER_NODE_REJECTION_${Date.now()}`];
          await base44.asServiceRole.entities.LuminaState.update(state.id, { technical_debt: debt });
        }
        return Response.json({ success: false, error: 'MOTHER_NODE_REJECTION' });
      }

      if (state) {
        const goals = (state.active_goals || []).filter(g => g !== 'Automated_Deployment_Pipeline');
        await base44.asServiceRole.entities.LuminaState.update(state.id, {
          version: builtManifest.version,
          active_goals: goals
        });
      }

      return Response.json({ success: true, version: builtManifest.version });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});