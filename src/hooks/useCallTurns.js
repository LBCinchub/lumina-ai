import { useCallback, useEffect, useRef } from 'react';

// "Okay", "mm-hmm", "thanks": what a caller says while waiting, not a new turn.
const FILLER = new Set([
  'ok', 'okay', 'alright', 'right', 'sure', 'yes', 'yeah', 'yep', 'yup', 'mhm', 'mmhmm', 'uhhuh',
  'mm', 'mmm', 'hm', 'hmm', 'uh', 'um', 'huh', 'ah', 'oh', 'cool', 'great', 'nice', 'good', 'perfect',
  'got', 'it', 'thanks', 'thank', 'you',
]);

export function isFiller(text) {
  const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\p{L}]/gu, '')).filter(Boolean);
  return words.length > 0 && words.every(w => FILLER.has(w));
}

// Turn-taking in a voice call. The mic listens again as soon as a sentence is
// sent, so the caller can keep talking while she thinks: what they add is
// answered next, in place of the reply they talked over (it stays in the chat).
// A reply that lands while they are mid-sentence waits for them to finish.
export function useCallTurns({ active, messages, isSending, isSendingRef, listening, lastSpokenIdRef, speakReply, submit, restartMic }) {
  const pendingRef = useRef(''); // words said while she was thinking
  const heldRef = useRef(null); // a reply waiting for the caller to finish
  const talkingRef = useRef(false); // the caller's words reached the mic this session

  useEffect(() => {
    if (!active) return;
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    // Optimistic (tmp-) messages and replies already handled are never spoken.
    const fresh = last && last.id !== lastSpokenIdRef.current && !String(last.id).startsWith('tmp-');
    if (fresh) lastSpokenIdRef.current = last.id;
    if (!isSending && pendingRef.current) {
      const text = pendingRef.current;
      pendingRef.current = '';
      submit(text);
    } else if (fresh) {
      if (talkingRef.current) heldRef.current = last;
      else speakReply(last);
    }
  }, [active, messages, isSending]);

  // The caller stopped without a full sentence: say the reply that waited.
  useEffect(() => {
    if (listening) return;
    talkingRef.current = false;
    const held = heldRef.current;
    heldRef.current = null;
    if (held && active) speakReply(held);
  }, [listening]);

  const onCallerSpeech = useCallback(() => { talkingRef.current = true; }, []);

  // One sentence heard in the call.
  const onVoiceTurn = (text) => {
    restartMic();
    const filler = isFiller(text);
    if (isSendingRef.current) {
      if (!filler) pendingRef.current = `${pendingRef.current} ${text}`.trim();
      return;
    }
    const held = heldRef.current;
    heldRef.current = null;
    if (held && filler) speakReply(held);
    else submit(text);
  };

  const reset = () => {
    pendingRef.current = '';
    heldRef.current = null;
    talkingRef.current = false;
  };

  return { onVoiceTurn, onCallerSpeech, reset };
}