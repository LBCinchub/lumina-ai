import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { AGENT_ACTIVE_LIMIT, sanitizeAgentInput } from '../../shared/userAgents.ts';

// Server-side UserAgent creation.
//
// The browser is NEVER trusted to supply ownership fields. The actor is
// derived exclusively from the server-authenticated session (base44.auth.me),
// and owner_email + ownership_state are stamped here — same pattern as
// createConversation. All reads/writes are user-scoped so RLS guarantees
// per-user isolation; a foreign user's records are never visible or touchable.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Only whitelisted content fields are read — never owner_email/ownership_state.
    const { fields, error } = sanitizeAgentInput(body);
    if (error) return Response.json({ error }, { status: 400 });

    // Free-tier limit: max AGENT_ACTIVE_LIMIT active agents per user.
    // User-scoped read — RLS returns only this user's agents.
    const active = await base44.entities.UserAgent.filter({ status: 'active' });
    if (active.length >= AGENT_ACTIVE_LIMIT) {
      return Response.json({
        error: `Free Plan Limit Reached — ${AGENT_ACTIVE_LIMIT} Active LBC AI Agent. Upgrade To LBC AI Superagent For Up To 10, Or Archive Your Current Agent To Create A New One.`,
        limit: AGENT_ACTIVE_LIMIT,
      }, { status: 409 });
    }

    // Knowledge sources must belong to the authenticated user.
    // User-scoped read under RLS silently drops any foreign ids.
    let knowledgeIds = [];
    if (fields.knowledge_source_ids.length > 0) {
      let owned = [];
      try {
        owned = await base44.entities.KnowledgeSource.filter(
          { id: { $in: fields.knowledge_source_ids } }
        );
      } catch (_) {}
      knowledgeIds = owned.map(k => k.id);
    }

    // User-scoped create: the platform stamps created_by; owner_email and
    // ownership_state are server-derived from the session, never from the body.
    const agent = await base44.entities.UserAgent.create({
      name: fields.name,
      persona: fields.persona,
      voice: fields.voice,
      instructions: fields.instructions,
      expertise: fields.expertise || '',
      knowledge_source_ids: knowledgeIds,
      status: 'active',
      is_private: true, // V1: agents are always private to their owner.
      owner_email: user.email,
      ownership_state: 'human_verified',
    });

    return Response.json({ agent });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}