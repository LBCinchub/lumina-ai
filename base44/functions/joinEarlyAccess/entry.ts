import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

// Public — captures early-access interest from the landing page for signed-out
// visitors. Strictly validated (email format + plan whitelist), deduplicated
// per email and plan. Never exposes or returns anything private.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const plan = typeof body.plan === 'string' ? body.plan.trim().slice(0, 80) : '';
    const ALLOWED_PLANS = ['LBC AI Superagent', 'LBC AI Ultra'];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return Response.json({ error: 'Enter A Valid Email Address' }, { status: 400 });
    }
    if (!ALLOWED_PLANS.includes(plan)) {
      return Response.json({ error: 'Choose A Valid Plan' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const existing = await db.entities.EarlyAccessInterest.filter(
      { email, plan }
    ).catch(() => []);
    if ((existing || []).length > 0) {
      return Response.json({ ok: true, already_joined: true });
    }

    await db.entities.EarlyAccessInterest.create({ email, plan });
    // Marketing KPI "Early access signups". track() sends in the background,
    // so keep the worker alive briefly for that send to finish.
    base44.analytics.track({ eventName: 'early_access_signup', properties: { plan } });
    waitUntil(new Promise((resolve) => setTimeout(resolve, 3000)));
    return Response.json({ ok: true });
  } catch (_) {
    return Response.json({ error: 'Something Went Wrong — Please Try Again' }, { status: 500 });
  }
}