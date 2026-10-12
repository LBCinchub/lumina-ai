// Synthetic, fake-timer tests for the client typewriter. No network, no data.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { createTypewriter, splitGraphemes } from '../src/lib/typewriter.js';

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message]); } };

function fakeClock() {
  let now = 0, seq = 0; const q = new Map();
  return {
    schedule: (fn, ms) => { const id = ++seq; q.set(id, { fn, at: now + ms }); return id; },
    cancel: (id) => q.delete(id),
    pending: () => q.size,
    advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of q) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
        if (!next) break;
        q.delete(next[0]); now = next[1].at; next[1].fn();
      }
      now = end;
    },
  };
}
function make(clock, extra = {}) {
  const frames = []; let done = false;
  const tw = createTypewriter({ schedule: clock.schedule, cancel: clock.cancel,
    onUpdate: (s) => frames.push(s), onDone: () => { done = true; }, ...extra });
  return { tw, frames, isDone: () => done };
}

const REPLY = 'Hello, world! Here is a list:\n\n- one\n- two\n\n```js\nconst x = 1;\n```\n[link](https://lbchub.site)';

test('new reply reveals incremental graphemes, one at a time', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText(REPLY); c.advance(1);
  assert.equal(frames[0], 'H');
  c.advance(25);
  assert.ok(frames.length >= 2 && frames.length < 6);
  for (let i = 1; i < frames.length; i++) assert.equal(splitGraphemes(frames[i]).length, splitGraphemes(frames[i - 1]).length + 1);
});

test('full content eventually matches exactly', () => {
  const c = fakeClock(); const { tw, frames, isDone } = make(c);
  tw.setText(REPLY); c.advance(60000);
  assert.equal(frames.at(-1), REPLY); assert.ok(isDone()); assert.equal(c.pending(), 0);
});

test('punctuation adds a natural pause', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText('Hi. Ok'); c.advance(0); c.advance(60);
  assert.equal(frames.at(-1), 'Hi.'); // held at the period
  c.advance(200); assert.equal(frames.at(-1), 'Hi. Ok');
});

test('incoming chunks are queued, not dumped as whole blocks', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText('Hello', false); c.advance(500);
  tw.setText('Hello there friend', false); c.advance(1);
  const len = splitGraphemes(frames.at(-1)).length;
  assert.ok(len <= 6, 'chunk was not dumped');
  tw.setText('Hello there friend!', true); c.advance(10000);
  assert.equal(frames.at(-1), 'Hello there friend!');
  for (let i = 1; i < frames.length; i++) assert.ok(splitGraphemes(frames[i]).length - splitGraphemes(frames[i - 1]).length <= 1);
});

test('split ZWJ emoji arriving across chunks is held, never shown half', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  const fam = '👨‍👩‍👧';
  tw.setText('A' + fam.slice(0, 2), false); c.advance(1000);
  assert.equal(frames.at(-1), 'A');
  tw.setText('A' + fam, true); c.advance(1000);
  assert.equal(frames.at(-1), 'A' + fam);
});

test('skip completes immediately with exact text', () => {
  const c = fakeClock(); const { tw, frames, isDone } = make(c);
  tw.setText(REPLY); c.advance(30); tw.skip();
  assert.equal(frames.at(-1), REPLY); assert.ok(isDone()); assert.equal(c.pending(), 0);
});

test('stop (unmount/thread switch) clears timers and emits nothing more', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText(REPLY); c.advance(30); tw.stop();
  const n = frames.length; assert.equal(c.pending(), 0);
  tw.setText('Other thread text'); c.advance(5000);
  assert.equal(frames.length, n);
});

test('resume from saved progress does not restart (remount/rerender)', () => {
  const c = fakeClock(); const { tw, frames } = make(c, { startIndex: 10 });
  tw.setText(REPLY); c.advance(1);
  assert.equal(frames[0], REPLY.slice(0, 11));
});

test('rerender with the same text does not restart', () => {
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText(REPLY); c.advance(100); const before = frames.at(-1);
  tw.setText(REPLY); c.advance(1);
  assert.ok(frames.at(-1).length >= before.length);
});

test('emoji, combining marks and Arabic are never split', () => {
  const text = 'é 👍🏽 🇨🇦 مرحبا بِكُم';
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText(text); c.advance(60000);
  const gs = splitGraphemes(text);
  frames.forEach((f, i) => assert.equal(f, gs.slice(0, i + 1).join('')));
  assert.ok(gs.includes('👍🏽') && gs.includes('🇨🇦') && gs.includes('é') && gs.includes('بِ'));
  assert.equal(frames.at(-1), text);
});

test('markdown prefixes render safely (no raw HTML injection)', () => {
  const evil = 'Hi <img src=x onerror=alert(1)> <script>bad()</script> **bold** [x](javascript:alert(1))\n```\ncode';
  const gs = splitGraphemes(evil);
  for (let i = 1; i <= gs.length; i++) {
    const html = renderToStaticMarkup(React.createElement(ReactMarkdown, null, gs.slice(0, i).join('')));
    assert.ok(!/<script|<img|<[^>]*\sonerror=|href="javascript:/i.test(html), 'unsafe at ' + i);
  }
});

test('completed text equals authoritative text (copy/persist untouched)', () => {
  const msg = { id: 'assistant-1', content: REPLY };
  const c = fakeClock(); const { tw, frames } = make(c);
  tw.setText(msg.content); c.advance(40);
  assert.equal(msg.content, REPLY); // displayed prefix never written back
  assert.notEqual(frames.at(-1), REPLY);
});

for (const r of results) console.log(r.join(' | '));
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} pass`);
process.exit(failed ? 1 : 0);