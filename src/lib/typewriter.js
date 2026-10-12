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

// ~6-20ms per grapheme (faster for long replies) plus short punctuation pauses.
export function delayFor(g, total) {
  const base = Math.max(6, Math.min(20, Math.round(6000 / Math.max(total, 1))));
  if (total > 800) return base;
  if (/[.!?؟。]/.test(g)) return base + 140;
  if (/[,;:،]/.test(g)) return base + 60;
  if (g === '\n') return base + 80;
  return base;
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
    if (i < limit()) { i++; emit(); }
    if (i < limit()) timer = schedule(run, delayFor(gs[i - 1], gs.length));
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