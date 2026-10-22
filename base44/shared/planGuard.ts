// Deterministic post-plan guard. The model proposes steps; this enforces the
// user's explicit constraints so they never depend on model compliance:
// - "do not send email / post / publish / spend / contact anyone" drops every
//   external, account-reading, destructive and financial step;
// - "use only this message" drops web research and document analysis;
// - "save it as a document / internal draft" guarantees a document.generate step.
import { REGISTRY } from './autopilotRegistry.ts';
import { directiveText } from './actionIntent.ts';

const PROHIBIT_EXTERNAL = /\b(do not|don't|dont|never|must not|without)\b[^.;!?\n]*\b(e-?mails?|send|post|publish|spend|pay|contact|external accounts?|gmail|inbox)\b/i;
const ONLY_MESSAGE = /\buse only (the details in |what is in |the info(rmation)? in )?this message\b|\bdo not read personal history\b/i;
const WANTS_SAVE = /\bsave (it|this|that|them|the (result|plan|checklist|output))\b|\bas an? (internal |markdown )*(draft|document|doc)\b|\bmarkdown document\b/i;
const REQUESTS_EXTERNAL = /\b(e-?mails?|gmail|inbox|send|post|publish|pay|buy|purchase|schedule|calendar|deploy|push|reply|replies)\b/;
const HARD_RISKS = ['external_write', 'destructive', 'financial'];

export function goalConstraints(goal: string) {
  const g = String(goal || '');
  return { noExternal: PROHIBIT_EXTERNAL.test(g), onlyMessage: ONLY_MESSAGE.test(g), wantsSave: WANTS_SAVE.test(g) };
}

// Same rule at plan time AND immediately before each step executes, so a
// stored/tampered/legacy plan can never run a step the goal prohibits.
export function stepAllowed(goal: string, capabilityId: string) {
  const c = REGISTRY[capabilityId];
  if (!c) return false;
  const { onlyMessage } = goalConstraints(goal);
  // External/destructive/financial steps need an explicit, non-negated,
  // non-quoted request in the goal itself; a planner can never add one.
  const noExternal = goalConstraints(goal).noExternal || !REQUESTS_EXTERNAL.test(directiveText(goal).toLowerCase());
  if (noExternal && (HARD_RISKS.includes(c.risk) || capabilityId.startsWith('email.') || capabilityId.startsWith('calendar.'))) return false;
  if (onlyMessage && ['research.web', 'research.deep', 'analyze.documents', 'knowledge.ingest'].includes(capabilityId)) return false;
  return true;
}

export function guardPlanSteps(goal: string, steps: any[], maxSteps: number) {
  const g = String(goal || '');
  let out = (steps || []).filter((s: any) => stepAllowed(g, s.capability_id));
  if (WANTS_SAVE.test(g) && !out.some((s: any) => s.capability_id === 'document.generate')) {
    if (out.length === 0) out.push({ capability_id: 'draft.content', title: 'Draft The Content', input: g.slice(0, 1500), status: 'pending', attempts: 0 });
    out = out.slice(0, maxSteps - 1);
    out.push({ capability_id: 'document.generate', title: REGISTRY['document.generate'].label, input: 'Save the result as a markdown document.', status: 'pending', attempts: 0 });
  }
  return out.slice(0, maxSteps);
}