// Plan-tier fit for Autopilot plans. A planned step above the user's plan that
// has an honest equivalent on their plan is swapped for it, and the swap is
// disclosed in the step title, the step input and the plan summary, so the
// task still runs end to end instead of stopping at Blocked. Everything else
// (send, post, pay, connect, analyze documents, build) is left as planned, so
// preflight keeps blocking it with the real reason. Live web research stays a
// paid capability: the free substitute never claims to have searched.
import { REGISTRY } from './autopilotRegistry.ts';
import { planAtLeast } from './tiers.ts';

const GENERAL_KNOWLEDGE = 'Live web research is not on this plan. Work from general knowledge only: say so in the first line, flag anything that may be out of date, and never claim to have searched.';
const NO_LIVE_WEB = 'Live Web Research Is Part Of LBC AI Superagent, So This Task Uses General Knowledge Instead. Upgrade For Live Sources.';
const GENERAL_INSTEAD = 'Uses General Knowledge Instead, Without Live Sources.';

// Ordered: the first fallback the user's plan includes wins. `instead` is the
// capabilities-list wording for the same swap.
const FALLBACKS: Record<string, any[]> = {
  'research.deep': [
    { to: 'research.web', tag: 'Live Web Research', input: '', note: 'Deep Research Is Part Of LBC AI Ultra, So This Task Uses Live Web Research Instead.', instead: 'Uses Live Web Research Instead.' },
    { to: 'draft.content', tag: 'General Knowledge', input: GENERAL_KNOWLEDGE, note: NO_LIVE_WEB, instead: GENERAL_INSTEAD },
  ],
  'research.web': [
    { to: 'draft.content', tag: 'General Knowledge', input: GENERAL_KNOWLEDGE, note: NO_LIVE_WEB, instead: GENERAL_INSTEAD },
  ],
  'document.generate': [
    { to: 'draft.content', tag: 'Not Saved To Library', input: "Saving to the document library is not on this plan. Compile the final write-up as this step's output only.", note: 'Saving To Your Library Is Part Of LBC AI Superagent, So The Result Stays On This Task.', instead: 'Keeps The Result On The Task Instead, Not Saved To Your Library.' },
  ],
};

// The disclosed substitute for a capability this plan does not include, or
// null (the plan includes it, or no honest equivalent exists).
export function planFallback(id: string, plan: string) {
  const reg: any = REGISTRY;
  if (planAtLeast(plan, reg[id]?.min_plan)) return null;
  return (FALLBACKS[id] || []).find((f: any) => planAtLeast(plan, reg[f.to].min_plan)) || null;
}

export function fitStepsToPlan(steps: any[], plan: string) {
  const notes = new Set<string>();
  const fitted = steps.map((s: any) => {
    const alt = planFallback(s.capability_id, plan);
    if (!alt) return s;
    notes.add(alt.note);
    const title = String(s.title || '').replace(/\s*\(NOT AVAILABLE[^)]*\)/gi, '').trim();
    return {
      ...s,
      capability_id: alt.to,
      title: `${title} (${alt.tag})`.slice(0, 120),
      input: (alt.input ? `${alt.input}\n${s.input || ''}` : String(s.input || '')).slice(0, 1500),
    };
  });
  return { steps: fitted, note: [...notes].join(' ') };
}