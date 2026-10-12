import React from 'react';

// Safe renderers: react-markdown never renders raw HTML (no rehype-raw), and
// links open in a new tab without opener access. Wide content scrolls inside
// its own box instead of stretching the page.
const markdownComponents = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-primary break-words" />
  ),
  pre: ({ node, ...props }) => (
    <pre {...props} className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-[13px] leading-relaxed" />
  ),
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto"><table {...props} className="w-full text-sm border-collapse" /></div>
  ),
  img: ({ node, alt, ...props }) => (
    <img {...props} alt={alt || ''} loading="lazy" className="my-3 max-w-full h-auto rounded-xl" />
  ),
};

export default markdownComponents;