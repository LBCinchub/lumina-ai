// The mic stays on while LBC AI speaks, so the caller can cut in. It also
// hears her own voice coming back from the speaker; these helpers tell the
// caller's words apart from that echo. What the mic heard is compared only
// with the words she said while it listened, never her whole reply, so the
// caller's words are not taken for hers just because she used them earlier.

// Her last words can still arrive from the recognizer this long after she stops.
const ECHO_TAIL_MS = 700;
// The slowest and fastest a voice gets through her text, in characters a
// second, and how far either side of that her words still count.
const SLOWEST_CPS = 9;
const FASTEST_CPS = 24;
const MARGIN = 24;
// Any one of these, when she is not saying it herself, means "stop talking".
const CUES = new Set(['stop', 'wait', 'hold', 'hang', 'pause', 'sorry', 'excuse', 'enough', 'nope', 'hey', 'hello',
  'actually', 'listen', 'cancel', 'quiet', 'shut']);
// How numbers she reads out ("$42.50") can come back from the recognizer.
const NUMBER_WORD = /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\p{L}+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|point|percent|and|dollars?|cents?)$/u;

const norm = (word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// The span of characters she can have reached at time `t`, from the last
// position her voice reported (or from when she began).
function reach(spoken, t) {
  const s = (t - (spoken.markAt ?? t)) / 1000; // not started yet: still on her first word
  const mark = spoken.mark || 0;
  return s >= 0
    ? [mark + s * SLOWEST_CPS, mark + s * FASTEST_CPS]
    : [mark + s * FASTEST_CPS, mark + s * SLOWEST_CPS];
}

// What of her reply a listening session that began at `sessionStart` may be
// hearing: the words she said since it began, or '' when none can be in it.
export function echoFor(spoken, sessionStart, now = Date.now()) {
  if (!spoken?.text) return '';
  const { text, endedAt } = spoken;
  if (endedAt != null && !(sessionStart < endedAt && now < endedAt + ECHO_TAIL_MS)) return '';
  const from = Math.max(0, reach(spoken, sessionStart)[0] - MARGIN);
  const end = text.indexOf(' ', reach(spoken, Math.min(now, endedAt ?? now))[1] + MARGIN);
  return text.slice(text.lastIndexOf(' ', from) + 1, end < 0 ? text.length : end);
}

// Misheard forms of her words ("prizing" for "pricing") still count as hers.
function close(a, b) {
  const limit = Math.max(a.length, b.length) >= 7 ? 2 : 1;
  if (Math.abs(a.length - b.length) > limit) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length] <= limit;
}

// Index of the first word the caller said over her, or -1 while everything
// heard can be her own voice. Evidence is a stop cue she is not saying, or two
// words she is not saying within three heard words ("no", or 3+ letters).
export function userSpeechStart(words, echo) {
  const hers = echo.split(/\s+/).map(norm).filter(Boolean);
  const said = new Set(hers);
  const readsNumbers = /\d/.test(echo);
  const isHers = (w) => said.has(w) || /^\d+$/.test(w) || (readsNumbers && NUMBER_WORD.test(w))
    || (w.length >= 4 && hers.some(h => close(h, w)));
  const heard = [];
  words.forEach((word, i) => {
    const w = norm(word);
    if (w.length >= 3 || w === 'no') heard.push({ i, w });
  });
  for (let k = 0; k < heard.length; k++) {
    const { i, w } = heard[k];
    if (isHers(w)) continue;
    if (CUES.has(w) || heard.slice(k + 1, k + 3).some(c => !isHers(c.w))) return i;
  }
  return -1;
}