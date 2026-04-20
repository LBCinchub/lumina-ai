import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if UserContext already exists
    const contexts = await base44.asServiceRole.entities.UserContext.filter({ created_by: user.email });
    const existing = contexts[0];

    const data = {
      identity: `I am Mokhtar Tarek Samara, the founder of this project. Email: mokhtartareksamara@gmail.com`
    };

    if (existing) {
      await base44.asServiceRole.entities.UserContext.update(existing.id, data);
    } else {
      await base44.asServiceRole.entities.UserContext.create(data);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});