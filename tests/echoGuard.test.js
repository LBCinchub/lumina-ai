import { test, expect } from 'vitest';
import { echoFor, userSpeechStart } from '@/lib/echoGuard';

const reply = 'The best way to approach pricing is a simple monthly plan at $42.50, with a yearly option.';
const long = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu';
const words = (s) => s.split(' ');

test('her own voice coming back through the mic is not the caller', () => {
  expect(userSpeechStart(words('the best way to approach pricing is a simple monthly'), reply)).toBe(-1);
  // A misheard word, or the price read back as words, still counts as her.
  expect(userSpeechStart(words('the best way to approach prizing is a simple monthly plan'), reply)).toBe(-1);
  expect(userSpeechStart(words('plan at 42 dollars and 50 cents with a yearly option'), reply)).toBe(-1);
});

test('the caller talking over her is found at once, from their first word', () => {
  const cue = words('a simple monthly plan hold on a second');
  expect(userSpeechStart(cue, reply)).toBe(cue.indexOf('hold'));
  const over = words('simple monthly plan actually I want to change topics');
  expect(userSpeechStart(over, reply)).toBe(over.indexOf('actually'));
  const no = words('a simple monthly no no');
  expect(userSpeechStart(no, reply)).toBe(no.indexOf('no'));
  // Two short words of their own are enough.
  const ask = words('yearly option can you repeat that');
  expect(userSpeechStart(ask, 'a yearly option.')).toBe(ask.indexOf('can'));
});

test('only what she said while the mic listened can be her echo', () => {
  // Far into a long reply, her first words are no longer what the mic hears.
  const late = echoFor({ text: long, mark: 0, markAt: 0, endedAt: null }, 6000, 7000);
  expect(late).toContain('foxtrot');
  expect(late).not.toContain('alpha');
  // The voice reported she is on "kilo": only the words around it count.
  const near = echoFor({ text: long, mark: long.indexOf('kilo'), markAt: 6000, endedAt: null }, 5000, 6500);
  expect(near).toContain('kilo');
  expect(near).not.toContain('bravo');
  expect(near).not.toContain('romeo');
  expect(userSpeechStart(words('golf hotel india juliet kilo'), near)).toBe(-1);
  expect(userSpeechStart(words('kilo alpha bravo'), near)).toBe(1);
  // Before her voice starts, only her opening words can come back.
  expect(echoFor({ text: long, mark: 0, markAt: null, endedAt: null }, 1000, 1500)).toBe('alpha bravo charlie delta');
});

test('her voice can only be in a session that ran while she spoke', () => {
  const spoke = (endedAt) => ({ text: reply, mark: 0, markAt: 1000, endedAt });
  expect(echoFor(spoke(null), 1000, 5000)).toBe(reply);
  expect(echoFor(spoke(3000), 1000, 3500)).toContain('pricing'); // last words still arriving
  expect(echoFor(spoke(3000), 1000, 4000)).toBe('');
  expect(echoFor(spoke(3000), 3200, 3300)).toBe(''); // began after she stopped
  expect(echoFor(undefined, 0, 0)).toBe('');
});