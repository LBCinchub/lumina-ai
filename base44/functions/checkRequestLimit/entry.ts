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
        subscription_status: 'free',
        last_reset_at: new Date().toISOString()
      });
    }

    // Check if user has active paid subscription
    const now = new Date();
    const isActive = sub.subscription_status === 'active' && 
                     sub.subscription_expires_at && 
                     new Date(sub.subscription_expires_at) > now;

    // Free tier: 20 requests per 24h
    const FREE_LIMIT = 20;
    const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Check if 24h has passed since last reset
    const lastReset = sub.last_reset_at ? new Date(sub.last_reset_at) : new Date(sub.created_date);
    const timeSinceReset = now - lastReset;
    const shouldReset = timeSinceReset > RESET_INTERVAL_MS;

    let requestsUsed = sub.requests_used;
    
    // Reset if 24h has passed
    if (shouldReset && !isActive) {
      requestsUsed = 0;
      await db.entities.UserSubscription.update(sub.id, {
        requests_used: 0,
        last_reset_at: now.toISOString()
      });
    }

    const canUse = isActive || requestsUsed < FREE_LIMIT;

    if (!canUse) {
      return Response.json({ 
        blocked: true,
        message: 'Free tier limit (20/24h) reached. Subscribe to continue or try again tomorrow.',
        requests_used: requestsUsed,
        free_limit: FREE_LIMIT
      }, { status: 403 });
    }

    // Increment request count
    await db.entities.UserSubscription.update(sub.id, {
      requests_used: requestsUsed + 1
    });

    return Response.json({ 
      allowed: true,
      requests_remaining: Math.max(0, FREE_LIMIT - (requestsUsed + 1)),
      subscription_status: sub.subscription_status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});