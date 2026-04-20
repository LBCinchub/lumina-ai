import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { myPlatform } = body;

    if (!myPlatform) {
      return Response.json({ error: 'Missing myPlatform' }, { status: 400 });
    }

    // Determine sister platform
    const sisterPlatform = myPlatform === 'lbc-hub.com' ? 'lbchub.site' : 'lbc-hub.com';

    // Fetch all conversations from sister platform
    const sisterConversations = await base44.asServiceRole.entities.SharedConversation.filter({
      platform_origin: sisterPlatform,
      is_accessible_to_sister: true
    }, '-last_message_at', 50);

    return Response.json({ conversations: sisterConversations });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});