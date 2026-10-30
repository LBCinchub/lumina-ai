// Client-side typewriter reveal. The backend returns the full reply in one
// response (no network streaming); this only animates its display. Text is
// split by Unicode grapheme so emoji, combining marks and Arabic never split.
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

export function splitGraphemes(text) {
  if (!text) return [];
  return segmenter ? Array.from(segmenter.segment(text), s => s.segment) : Array.from(text);
}

// Quick reveal: about one second for a reply of any length. One frame every
// 16ms; short replies show one grapheme per frame, long ones several.
export const FRAME_MS = 16;
const TARGET_FRAMES = 60;
export function stepFor(total) {
  return Math.max(1, Math.ceil(total / TARGET_FRAMES));
}

export function createTypewriter({ onUpdate, onDone, startIndex = 0,
  schedule = (fn, ms) => setTimeout(fn, ms), cancel = (t) => clearTimeout(t) }) {
  let gs = [], text = '', i = startIndex, final = false, timer = null, stopped = false, done = false;
  // A non-final (still arriving) tail grapheme is held back until complete.
  const limit = () => (final ? gs.length : Math.max(0, gs.length - 1));
  const emit = () => onUpdate(gs.slice(0, i).join(''), i);
  const finish = () => {
    if (done || stopped) return;
    done = true; i = gs.length;
    if (timer) { cancel(timer); timer = null; }
    emit(); onDone?.();
  };
  const run = () => {
    timer = null;
    if (stopped || done) return;
    if (i < limit()) { i = Math.min(limit(), i + stepFor(gs.length)); emit(); }
    if (i < limit()) timer = schedule(run, FRAME_MS);
    else if (final) finish();
  };
  return {
    setText(next, isFinal = true) {
      if (stopped || done) return;
      const replaced = !next.startsWith(text);
      text = next; gs = splitGraphemes(next); final = isFinal;
      if (replaced) { finish(); return; }
      i = Math.min(i, gs.length);
      if (!timer) timer = schedule(run, 0);
    },
    skip() { final = true; finish(); },
    stop() { stopped = true; if (timer) cancel(timer); timer = null; },
  };
}