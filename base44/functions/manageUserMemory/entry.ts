import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { MEMORY_CATEGORIES } from '../../shared/longTermMemory.ts';

// Authenticated CRUD for the owner's long-term memories (Memory area in
// Settings). Ownership is always derived from the server session — never the
// browser. The service role is used only after auth.me() succeeds.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, id, content, category } = await req.json();
    const db = base44.asServiceRole;

    if (action === 'list') {
      const items = await db.entities.UserMemory.filter({ owner_email: user.email }, '-updated_date', 200);
      return Response.json({ memories: items });
    }

    if (action === 'update') {
      const owned = await db.entities.UserMemory.filter({ id, owner_email: user.email });
      if (!owned.length) return Response.json({ error: 'Not found' }, { status: 404 });
      const text = String(content || '').trim().slice(0, 500);
      if (!text) return Response.json({ error: 'Memory Cannot Be Empty' }, { status: 400 });
      const cat = MEMORY_CATEGORIES.includes(category) ? category : owned[0].category;
      const saved = await db.entities.UserMemory.update(owned[0].id, { content: text, category: cat, last_reinforced_at: new Date().toISOString() });
      return Response.json({ memory: saved });
    }

    if (action === 'delete') {
      const owned = await db.entities.UserMemory.filter({ id, owner_email: user.email });
      if (!owned.length) return Response.json({ error: 'Not found' }, { status: 404 });
      await db.entities.UserMemory.delete(owned[0].id);
      return Response.json({ deleted: true });
    }

    if (action === 'clearAll') {
      // Owner-scoped specific query only — never a broad delete.
      await db.entities.UserMemory.deleteMany({ owner_email: user.email });
      return Response.json({ cleared: true });
    }

    return Response.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (_) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}