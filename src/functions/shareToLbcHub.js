/* deno-lint-ignore no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, messages } = await req.json();

    if (!title || !messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Missing title or messages' }, { status: 400 });
    }

    // Create a SharedConversation record
    const sharedConvo = await base44.asServiceRole.entities.SharedConversation.create({
      conversation_id: `shared-${Date.now()}`,
      platform_origin: 'lbchub.site',
      title,
      summary: (messages[0]?.content || '').slice(0, 200),
      messages,
      last_message_at: new Date().toISOString(),
      is_accessible_to_sister: true
    });

    return Response.json({
      success: true,
      shared_id: sharedConvo.id,
      message: 'Conversation shared to lbc-hub.com'
    });
  } catch (error) {
    console.error('shareToLbcHub error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});