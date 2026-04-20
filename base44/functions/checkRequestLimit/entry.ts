import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = base44.asServiceRole;

    // Get or create user subscription
    const subs = await db.entities.UserSubscription.filter({ created_by: user.email });
    let sub = subs[0];

    if (!sub) {
      sub = await db.entities.UserSubscription.create({
        requests_used: 0,
        subscription_status: 'free'
      });
    }

    // Check if user has active paid subscription
    const now = new Date();
    const isActive = sub.subscription_status === 'active' && 
                     sub.subscription_expires_at && 
                     new Date(sub.subscription_expires_at) > now;

    // Free tier: 3 requests per month
    const FREE_LIMIT = 3;
    const canUse = isActive || sub.requests_used < FREE_LIMIT;

    if (!canUse) {
      return Response.json({ 
        blocked: true,
        message: 'Free tier limit reached. Subscribe to continue.',
        requests_used: sub.requests_used,
        free_limit: FREE_LIMIT
      }, { status: 403 });
    }

    // Increment request count
    await db.entities.UserSubscription.update(sub.id, {
      requests_used: sub.requests_used + 1
    });

    return Response.json({ 
      allowed: true,
      requests_remaining: Math.max(0, FREE_LIMIT - (sub.requests_used + 1)),
      subscription_status: sub.subscription_status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});