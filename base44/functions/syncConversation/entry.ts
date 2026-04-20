import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, platformOrigin } = body;

    if (!conversationId || !platformOrigin) {
      return Response.json({ error: 'Missing conversationId or platformOrigin' }, { status: 400 });
    }

    // Fetch or create shared conversation record
    const existing = await base44.asServiceRole.entities.SharedConversation.filter({
      conversation_id: conversationId,
      platform_origin: platformOrigin
    });

    if (existing.length > 0) {
      return Response.json({ shared: existing[0], synced: true });
    }

    // If conversation doesn't exist in shared pool, create it
    const shared = await base44.asServiceRole.entities.SharedConversation.create({
      conversation_id: conversationId,
      platform_origin: platformOrigin,
      title: body.title || 'Synced conversation',
      summary: body.summary || '',
      messages: body.messages || [],
      last_message_at: new Date().toISOString(),
      is_accessible_to_sister: true
    });

    return Response.json({ shared, synced: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});