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
        build_requests_used: 0,
        last_build_reset_at: new Date().toISOString()
      });
    }

    // Check if user has active paid subscription
    const now = new Date();
    const isActive = sub.subscription_status === 'active' && 
                     sub.subscription_expires_at && 
                     new Date(sub.subscription_expires_at) > now;

    // Build page: 3 requests per 24h
    const BUILD_LIMIT = 3;
    const RESET_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Check if 24h has passed since last reset
    const lastReset = sub.last_build_reset_at ? new Date(sub.last_build_reset_at) : new Date(sub.created_date);
    const timeSinceReset = now - lastReset;
    const shouldReset = timeSinceReset > RESET_INTERVAL_MS;

    let buildRequestsUsed = sub.build_requests_used || 0;
    
    // Reset if 24h has passed
    if (shouldReset && !isActive) {
      buildRequestsUsed = 0;
      await db.entities.UserSubscription.update(sub.id, {
        build_requests_used: 0,
        last_build_reset_at: now.toISOString()
      });
    }

    const canUse = isActive || buildRequestsUsed < BUILD_LIMIT;

    if (!canUse) {
      return Response.json({ 
        blocked: true,
        message: 'Build limit (3/24h) reached. Subscribe to continue or try again tomorrow.',
        requests_used: buildRequestsUsed,
        limit: BUILD_LIMIT
      }, { status: 403 });
    }

    // Increment request count
    await db.entities.UserSubscription.update(sub.id, {
      build_requests_used: buildRequestsUsed + 1
    });

    return Response.json({ 
      allowed: true,
      requests_remaining: Math.max(0, BUILD_LIMIT - (buildRequestsUsed + 1)),
      subscription_status: sub.subscription_status
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});