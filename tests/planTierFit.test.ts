// Plan-tier fit: gated research and save steps get honest equivalents on the
// user's plan; external actions are never swapped. Synthetic data only.
import { test, expect } from 'vitest';
import { fitStepsToPlan, planFallback } from '../base44/shared/planTierFit.ts';
import { preflight } from '../base44/shared/autopilotEngine.ts';

const step = (capability_id: string, title = 'Step') => ({ capability_id, title, input: 'note-taking apps', status: 'pending', attempts: 0 });

test('free plan: research runs from general knowledge, disclosed, and passes preflight', () => {
  const { steps, note } = fitStepsToPlan([
    step('research.web', 'Research apps (NOT AVAILABLE: Requires LBC AI Superagent.)'),
    step('draft.content', 'Summarize pros and cons'),
    step('document.generate', 'Save report'),
  ], 'free');
  expect(steps.map((s: any) => s.capability_id)).toEqual(['draft.content', 'draft.content', 'draft.content']);
  expect(steps[0].title).toBe('Research apps (General Knowledge)');
  expect(steps[0].input).toMatch(/never claim to have searched/);
  expect(steps[1].title).toBe('Summarize pros and cons');
  expect(note).toMatch(/General Knowledge Instead/);
  expect(preflight(steps, 'free', false)).toBeNull();
});

test('superagent keeps live research; deep research falls back to live research', () => {
  const { steps } = fitStepsToPlan([step('research.web'), step('research.deep')], 'superagent');
  expect(steps.map((s: any) => s.capability_id)).toEqual(['research.web', 'research.web']);
});

test('capabilities list reports the same fallbacks the planner uses', () => {
  expect(planFallback('research.web', 'free')?.instead).toMatch(/General Knowledge Instead/);
  expect(planFallback('document.generate', 'free')?.instead).toMatch(/Not Saved To Your Library/);
  expect(planFallback('research.deep', 'superagent')?.instead).toMatch(/Live Web Research Instead/);
  expect(planFallback('research.web', 'superagent')).toBeNull();
  expect(planFallback('email.send', 'free')).toBeNull();
});

test('actions are never swapped, so preflight still blocks them honestly', () => {
  const { steps, note } = fitStepsToPlan([step('email.send')], 'free');
  expect(steps[0].capability_id).toBe('email.send');
  expect(note).toBe('');
  expect(preflight(steps, 'free', false, { gmailConnected: true })).toMatch(/Requires LBC AI Ultra/);
});