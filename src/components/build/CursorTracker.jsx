import React from 'react';

export default function CursorTracker({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_position);

  if (!others.length) return null;

  return (
    <>
      {others.map(c => (
        <div
          key={c.user_email}
          className="absolute pointer-events-none z-50 transition-all duration-100"
          style={{
            top: `${c.cursor_position?.y || 0}px`,
            left: `${c.cursor_position?.x || 0}px`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M0 0L0 12L3.5 8.5L6 14L7.5 13.5L5 8H9.5L0 0Z" fill={c.color || '#10b981'} />
          </svg>
          <span
            className="absolute left-4 top-0 text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{ backgroundColor: c.color || '#10b981', color: '#000' }}
          >
            {c.user_name || c.user_email?.split('@')[0]}
          </span>
        </div>
      ))}
    </>
  );
}