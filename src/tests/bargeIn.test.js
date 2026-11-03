import { test, expect } from 'vitest';
import { userSpeechStart } from '@/lib/echoGuard';

const reply = 'The best way to approach pricing is a simple monthly plan at $42.50, with a yearly option.';

test('once the mic level shows the caller talking, their first word is enough', () => {
  const heard = 'simple monthly plan so'.split(' ');
  expect(userSpeechStart(heard, reply)).toBe(-1);
  expect(userSpeechStart(heard, reply, true)).toBe(3);
  // Her own words still arriving right after she stopped are not theirs.
  expect(userSpeechStart('simple monthly plan'.split(' '), reply, true)).toBe(-1);
});