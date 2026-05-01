import React from 'react';

export default function CursorTracker({ collaborators = [], currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_position);
  if (others.length === 0) return null;

  return (
    <>
      {others.map((c, i) => (
        <div
          key={c.id || i}
          className="absolute pointer-events-none z-10 transition-all duration-150"
          style={{
            left: `${(c.cursor_position?.column || 0) / 120 * 100}%`,
            top: `${(c.cursor_position?.line || 0) * 20}px`,
          }}
        >
          <div
            className="w-2 h-4 rounded-sm opacity-70"
            style={{ background: c.color || '#6366f1' }}
          />
          <div
            className="text-[9px] font-medium text-white px-1 py-0.5 rounded whitespace-nowrap mt-0.5"
            style={{ background: c.color || '#6366f1' }}
          >
            {c.user_name || c.user_email?.split('@')[0]}
          </div>
        </div>
      ))}
    </>
  );
}