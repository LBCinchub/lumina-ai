import React from 'react';

export default function CursorTracker({ collaborators, currentUserEmail }) {
  const others = collaborators.filter(c => c.user_email !== currentUserEmail && c.cursor_position);
  if (others.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {others.map(c => {
        const pos = c.cursor_position;
        if (!pos?.x || !pos?.y) return null;
        return (
          <div
            key={c.user_email}
            className="absolute transition-all duration-150"
            style={{ left: pos.x, top: pos.y }}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
              <path d="M0 0L0 13L3.5 9.5L6 14L7.5 13.5L5 8.5L9 8.5L0 0Z" fill={c.color || '#4ECDC4'} />
            </svg>
            <span
              className="absolute left-3 top-0 text-[10px] font-medium text-white px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: c.color || '#4ECDC4' }}
            >
              {c.user_name || c.user_email}
            </span>
          </div>
        );
      })}
    </div>
  );
}