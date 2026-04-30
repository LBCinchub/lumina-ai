import React from 'react';

export default function CursorTracker({ collaborators, currentUserEmail }) {
  const others = (collaborators || []).filter(c => c.user_email !== currentUserEmail && c.cursor_position);
  if (!others.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {others.map((c, i) => {
        const { line = 0, column = 0 } = c.cursor_position || {};
        const top = Math.min((line / 100) * 100, 95);
        const left = Math.min((column / 120) * 100, 95);
        return (
          <div
            key={c.id || i}
            className="absolute flex items-center gap-1 transition-all duration-300"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <div
              className="w-2 h-4 rounded-sm opacity-80"
              style={{ backgroundColor: c.color || '#6366f1' }}
            />
            <span
              className="text-[9px] text-white px-1 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: c.color || '#6366f1' }}
            >
              {c.user_name || c.user_email?.split('@')[0] || '?'}
            </span>
          </div>
        );
      })}
    </div>
  );
}