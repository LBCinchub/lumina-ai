import React from 'react';

export default function CursorTracker({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_x != null);
  if (others.length === 0) return null;

  return (
    <>
      {others.map((c, i) => (
        <div
          key={c.id || i}
          className="absolute pointer-events-none z-50"
          style={{ left: c.cursor_x, top: c.cursor_y }}
        >
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <path d="M0 0L12 8L6 9L4 16L0 0Z" fill={c.color || '#6366f1'} />
          </svg>
          <span
            className="text-[9px] text-white px-1 py-0.5 rounded whitespace-nowrap"
            style={{ backgroundColor: c.color || '#6366f1' }}
          >
            {c.user_name || c.user_email}
          </span>
        </div>
      ))}
    </>
  );
}