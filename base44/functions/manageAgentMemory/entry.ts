import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getUserPlan, planAtLeast } from '../../shared/tiers.ts';

// Persistent agent memory management — server-side only.
//  - Ownership is verified through RLS-scoped reads: a foreign agent id
//    filters to nothing → 404, and its existence is never revealed.
//  - Tier gate: Agent Memory is included with LBC AI Superagent. Honest
//    rejection, never faked.
//  - Memories are per-agent and per-user isolated via RLS.

const MAX_MEMORY_CHARS = 500;
const MAX_MEMORIES_PER_AGENT = 50;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agent_id === 'string' ? body.agent_id : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!agentId || !action) {
      return Response.json({ error: 'Missing agent_id or action' }, { status: 400 });
    }

    // RLS-verified ownership: a foreign id filters to nothing.
    let agents = [];
    try {
      agents = await base44.entities.UserAgent.filter({ id: agentId });
    } catch (_) {}
    if (!agents || !agents[0]) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    if (action === 'add') {
      const plan = await getUserPlan(base44, user);
      if (!planAtLeast(plan, 'superagent')) {
        return Response.json({ error: 'Agent Memory Is Included With LBC AI Superagent', plan }, { status: 403 });
      }
      const content = typeof body.content === 'string' ? body.content.trim().slice(0, MAX_MEMORY_CHARS) : '';
      if (!content) {
        return Response.json({ error: 'Memory Content Is Required' }, { status: 400 });
      }
      const existing = await base44.entities.AgentMemory.filter(
        { agent_id: agentId }, 'created_date', MAX_MEMORIES_PER_AGENT + 1
      );
      if ((existing || []).length >= MAX_MEMORIES_PER_AGENT) {
        return Response.json({
          error: `Memory Limit Reached — Up To ${MAX_MEMORIES_PER_AGENT} Memories Per Agent`,
        }, { status: 409 });
      }
      const memory = await base44.entities.AgentMemory.create({ agent_id: agentId, content });
      return Response.json({ memory });
    }

    if (action === 'remove') {
      const memoryId = typeof body.memory_id === 'string' ? body.memory_id : '';
      if (!memoryId) return Response.json({ error: 'Missing memory_id' }, { status: 400 });
      // User-scoped read: RLS guarantees this is the caller's own memory.
      let memories = [];
      try {
        memories = await base44.entities.AgentMemory.filter({ id: memoryId });
      } catch (_) {}
      const memory = memories && memories[0];
      if (!memory || memory.agent_id !== agentId) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      await base44.entities.AgentMemory.delete(memoryId);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}