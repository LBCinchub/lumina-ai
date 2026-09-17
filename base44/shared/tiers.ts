// Shared plan-tier helpers for LBC AI backend functions. Server-side only.
// Free = basic chat only. Superagent = live web search + page reading,
// document generation, memory, automations, phone connect. Ultra = everything,
// including Deep Search, connectors, sub-agents, skills, image generation.
import { isFounderEmail } from "./security.ts";

export const PLAN_RANK = { free: 0, superagent: 1, ultra: 2 };

export function planAtLeast(plan, minimum) {
  return (PLAN_RANK[plan] || 0) >= (PLAN_RANK[minimum] || 0);
}

// Canonical plan source: the user's EARLIEST UserSubscription record — later
// records can never reset or quietly upgrade a user's tier. The founder
// session always previews at Ultra so the owner can approve capabilities
// before launch; real users' tiers are set by the owner, never by client input.
export async function getUserPlan(client, user) {
  if (isFounderEmail(user?.email)) return 'ultra';
  let records = [];
  try {
    records = await client.entities.UserSubscription.filter({}, 'created_date', 10);
  } catch (_) {}
  const canonical = (records || [])[0];
  if (
    canonical &&
    typeof canonical.plan === 'string' &&
    PLAN_RANK[canonical.plan] !== undefined &&
    canonical.subscription_status === 'active' &&
    (!canonical.subscription_expires_at || new Date(canonical.subscription_expires_at).getTime() > Date.now())
  ) {
    return canonical.plan;
  }
  return 'free';
}