import { test, expect } from 'vitest';
import { isFiller } from '@/hooks/useCallTurns';

test('waiting sounds are not a new turn, anything else is', () => {
  for (const t of ['Okay.', 'mm-hmm', 'Thank you!', 'yeah okay', 'got it']) expect(isFiller(t)).toBe(true);
  for (const t of ['with a focus on the launch', 'never mind', 'okay so what about the budget', 'week']) {
    expect(isFiller(t)).toBe(false);
  }
});