import { useRef, useState, useEffect, useCallback } from 'react';

const NEAR_BOTTOM_PX = 96;

// Follows new content only while the reader is at the latest message.
// Reading up is never interrupted; a jump control appears instead.
export function useChatScroll(messageCount, threadKey) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const pinnedRef = useRef(true);
  const lastCountRef = useRef(messageCount);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  const toBottom = useCallback((smooth) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }, []);

  const pin = useCallback(() => {
    pinnedRef.current = true;
    setAtBottom(true);
    setHasNew(false);
    requestAnimationFrame(() => toBottom(true));
  }, [toBottom]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    pinnedRef.current = near;
    setAtBottom(near);
    if (near) setHasNew(false);
  }, []);

  // New thread opened: start at its latest message.
  useEffect(() => {
    pinnedRef.current = true;
    setAtBottom(true);
    setHasNew(false);
    lastCountRef.current = 0;
  }, [threadKey]);

  // Content grew (new message, late image, layout): follow only if pinned.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (pinnedRef.current) toBottom(false); });
    ro.observe(content);
    return () => ro.disconnect();
  }, [toBottom, threadKey]);

  useEffect(() => {
    if (messageCount > lastCountRef.current && !pinnedRef.current) setHasNew(true);
    if (pinnedRef.current) toBottom(false);
    lastCountRef.current = messageCount;
  }, [messageCount, toBottom]);

  return { scrollRef, contentRef, onScroll, atBottom, hasNew, pin };
}