// The mic stays on while LBC AI speaks, so the caller can cut in. It also
// hears her own voice coming back from the speaker; these helpers tell the
// caller's words apart from that echo.

// Her last words can still arrive from the recognizer this long after she stops.
const ECHO_TAIL_MS = 700;
// Any one of these, when she is not saying it herself, means "stop talking".
const CUES = new Set(['stop', 'wait', 'hold', 'hang', 'pause', 'sorry', 'excuse', 'enough', 'nope']);
// How numbers she reads out ("$42.50") can come back from the recognizer.
const NUMBER_WORD = /^(zero|three|four|five|seven|eight|nine|eleven|twelve|\p{L}+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|point|percent|dollars?|cents?)$/u;

const norm = (word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// The reply a listening session that began at `sessionStart` may be hearing,
// or '' when none of her voice can be in it.
export function echoFor(spoken, sessionStart, now = Date.now()) {
  if (!spoken?.text) return '';
  if (spoken.endedAt == null) return spoken.text;
  return sessionStart < spoken.endedAt && now < spoken.endedAt + ECHO_TAIL_MS ? spoken.text : '';
}

// Index of the first word the caller said over her, or -1 while everything
// heard is her own voice. Evidence is words of 4+ letters she is not saying:
// a stop cue, or two of them within three such words.
export function userSpeechStart(words, echo) {
  const hers = ` ${echo.split(/\s+/).map(norm).join(' ')} `;
  const readsNumbers = /\d/.test(echo);
  const isHers = (w) => hers.includes(w) || (readsNumbers && NUMBER_WORD.test(w));
  const content = [];
  words.forEach((word, i) => {
    const w = norm(word);
    if (w.length >= 4) content.push({ i, w });
  });
  for (let k = 0; k < content.length; k++) {
    const { i, w } = content[k];
    if (isHers(w)) continue;
    if (CUES.has(w) || content.slice(k + 1, k + 3).some(c => !isHers(c.w))) return i;
  }
  return -1;
}