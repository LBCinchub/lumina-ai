import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// FAIL-CLOSED. This legacy endpoint returned every user's shared
// conversations from the other platform to ANY signed-in caller (service-role
// read with no owner predicate). Cross-app retrieval is a separate blocked
// audit, so the endpoint now returns nothing. No records are read, changed or
// removed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ error: 'Cross-App Conversation Retrieval Is Disabled', conversations: [] }, { status: 410 });
  } catch (_) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}