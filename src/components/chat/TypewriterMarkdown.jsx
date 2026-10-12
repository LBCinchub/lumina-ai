import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTypewriter } from '@/hooks/useTypewriter';

// Renders a reply as safe Markdown (no raw HTML). A newly arrived reply is
// revealed grapheme by grapheme once; history renders in full. Screen readers
// get the full text once plus a single completion announcement.
export default function TypewriterMarkdown({ id, text, animate, components }) {
  const { shown, done, skip } = useTypewriter(id, text, animate);
  return (
    <>
      <div aria-hidden={!done || undefined}>
        <ReactMarkdown components={components}>{shown}</ReactMarkdown>
      </div>
      {!done && <div className="sr-only">{text}</div>}
      {animate && <span className="sr-only" role="status" aria-live="polite">{done ? 'Reply complete' : ''}</span>}
      {!done && (
        <button
          type="button"
          onClick={skip}
          className="mt-2 text-[12px] text-pink-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Show Full Reply
        </button>
      )}
    </>
  );
}