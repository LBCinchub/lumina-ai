import React from 'react';

export default function CursorTracker({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_position);

  return (
    <>
      {others.map((c, i) => {
        const pos = c.cursor_position;
        if (!pos?.x || !pos?.y) return null;
        return (
          <div
            key={c.user_email || i}
            className="absolute pointer-events-none z-50 transition-all duration-100"
            style={{ left: pos.x, top: pos.y }}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill={c.color || '#6366f1'}>
              <path d="M0 0 L0 14 L4 10 L8 16 L10 15 L6 9 L12 9 Z" />
            </svg>
            <span
              className="ml-2 text-[10px] text-white px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: c.color || '#6366f1' }}
            >
              {c.user_name || c.user_email}
            </span>
          </div>
        );
      })}
    </>
  );
}