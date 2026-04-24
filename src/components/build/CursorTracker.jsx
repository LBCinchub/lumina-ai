import React from 'react';

export default function CursorTracker({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_position);

  if (others.length === 0) return null;

  return (
    <>
      {others.map((c, i) => (
        <div
          key={c.id || i}
          className="absolute pointer-events-none z-50 flex items-center gap-1"
          style={{
            left: `${(c.cursor_position?.column || 0) * 8}px`,
            top: `${(c.cursor_position?.line || 0) * 20}px`,
          }}
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: c.color || '#6366f1' }}
          />
          <span
            className="text-[10px] px-1 rounded text-white whitespace-nowrap"
            style={{ backgroundColor: c.color || '#6366f1' }}
          >
            {c.user_name || c.user_email}
          </span>
        </div>
      ))}
    </>
  );
}