import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-side Conversation creation.
//
// The browser is NEVER trusted to supply ownership fields. The actor is
// derived exclusively from the server-authenticated session (base44.auth.me),
// and the canonical ownership metadata is stamped here so every new
// Conversation is immediately classifiable as `human_verified` by the
// integrity layer. The request body may only supply `title`.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.email) return Response.json({ error: 'Session missing email' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    // Only `title` is read from the request — never owner_email/ownership_state.
    const title = (typeof body.title === 'string' && body.title.trim()) || 'New conversation';

    // User-scoped create so the platform stamps created_by_id to the actor;
    // owner_email + ownership_state are server-derived, not browser-supplied.
    const convo = await base44.entities.Conversation.create({
      title: title.slice(0, 60),
      last_message_at: new Date().toISOString(),
      owner_email: user.email,
      ownership_state: 'human_verified',
    });

    return Response.json({ conversation: convo, id: convo.id });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}