import { test, expect } from 'vitest';
import { echoFor, userSpeechStart } from '@/lib/echoGuard';

const reply = 'The best way to approach pricing is a simple monthly plan at $42.50, with a yearly option.';
const words = (s) => s.split(' ');

test('her own voice coming back through the mic is not the caller', () => {
  expect(userSpeechStart(words('the best way to approach pricing is a simple monthly'), reply)).toBe(-1);
  // A misheard word, or the price read back as words, still counts as her.
  expect(userSpeechStart(words('the best way to approach prizing is a simple monthly plan'), reply)).toBe(-1);
  expect(userSpeechStart(words('plan at 42 dollars and 50 cents with a yearly option'), reply)).toBe(-1);
});

test('the caller talking over her is found, from their first word', () => {
  const cue = words('a simple monthly plan hold on a second');
  expect(userSpeechStart(cue, reply)).toBe(cue.indexOf('hold'));
  const over = words('simple monthly plan actually I want to change topics');
  expect(userSpeechStart(over, reply)).toBe(over.indexOf('actually'));
});

test('her voice can only be in a session that ran while she spoke', () => {
  expect(echoFor({ text: reply, endedAt: null }, 1000, 5000)).toBe(reply);
  expect(echoFor({ text: reply, endedAt: 3000 }, 1000, 3500)).toBe(reply); // last words still arriving
  expect(echoFor({ text: reply, endedAt: 3000 }, 1000, 4000)).toBe('');
  expect(echoFor({ text: reply, endedAt: 3000 }, 3200, 3300)).toBe(''); // began after she stopped
  expect(echoFor(undefined, 0, 0)).toBe('');
});