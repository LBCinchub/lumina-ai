import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { AGENT_ACTIVE_LIMIT, AGENT_STATUSES, sanitizeAgentInput } from '../../shared/userAgents.ts';

// Server-side UserAgent edit + archive/restore.
//
// Security model:
//  - The agent is loaded with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign agent id returns nothing → 404. Only the owner can
//    edit or archive their agent.
//  - Ownership fields (owner_email / ownership_state) are never accepted from
//    the request body — only whitelisted content fields + status.
//  - Knowledge source ids are re-validated against the user's own sources.
//  - Restoring an archived agent (archived → active) re-enforces the
//    free-tier active-agent limit.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    if (!agentId) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

    // RLS-verified ownership: a foreign id filters to nothing (the SDK may
    // also throw on an invalid id) — either way it is not the caller's agent.
    let agents = [];
    try {
      agents = await base44.entities.UserAgent.filter({ id: agentId });
    } catch (_) {}
    const agent = agents && agents[0];
    if (!agent) return Response.json({ error: 'Not found' }, { status: 404 });

    // Whitelisted content fields only (partial validation — only what's sent).
    const { fields, error } = sanitizeAgentInput(body, { partial: true });
    if (error) return Response.json({ error }, { status: 400 });

    const updates = { ...fields };

    // Knowledge sources must belong to the authenticated user (RLS drops foreign ids).
    if (fields.knowledge_source_ids) {
      if (fields.knowledge_source_ids.length > 0) {
        let owned = [];
        try {
          owned = await base44.entities.KnowledgeSource.filter(
            { id: { $in: fields.knowledge_source_ids } }
          );
        } catch (_) {}
        updates.knowledge_source_ids = owned.map(k => k.id);
      } else {
        updates.knowledge_source_ids = [];
      }
    }

    // Status transitions (archive / restore).
    if (body.status !== undefined) {
      if (!AGENT_STATUSES.includes(body.status)) {
        return Response.json({ error: 'Status must be active or archived' }, { status: 400 });
      }
      if (body.status === 'active' && agent.status !== 'active') {
        // Restoring counts against the free-tier active limit.
        const active = await base44.entities.UserAgent.filter({ status: 'active' });
        if (active.length >= AGENT_ACTIVE_LIMIT) {
          return Response.json({
            error: `Free plan limit reached: ${AGENT_ACTIVE_LIMIT} active agents. Archive another agent first.`,
            limit: AGENT_ACTIVE_LIMIT,
          }, { status: 409 });
        }
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ agent });
    }

    // User-scoped update — RLS enforces ownership on write.
    const updated = await base44.entities.UserAgent.update(agentId, updates);
    return Response.json({ agent: updated });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}